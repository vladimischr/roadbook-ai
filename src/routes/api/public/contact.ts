import * as React from 'react'
import { render } from '@react-email/components'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'roadbook-ai-pro'
const SENDER_DOMAIN = 'notify.getroadbook.com'
const FROM_DOMAIN = 'getroadbook.com'

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(120),
  email: z.string().trim().email('Email invalide').max(255),
  subject: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().min(5, 'Message trop court').max(5000),
  // Honeypot — bots fill this; real users leave it empty.
  website: z.string().max(0).optional().default(''),
})

export const Route = createFileRoute('/api/public/contact')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json(
            { error: 'Server configuration error' },
            { status: 500 },
          )
        }

        let parsed: z.infer<typeof contactSchema>
        try {
          const body = await request.json()
          parsed = contactSchema.parse(body)
        } catch (err) {
          const message =
            err instanceof z.ZodError
              ? err.errors[0]?.message || 'Invalid input'
              : 'Invalid JSON in request body'
          return Response.json({ error: message }, { status: 400 })
        }

        // Silently accept honeypot hits (don't reveal the trap to bots)
        if (parsed.website) {
          return Response.json({ success: true })
        }

        const entry = TEMPLATES['contact-message']
        if (!entry || !entry.to) {
          return Response.json(
            { error: 'Contact template not configured' },
            { status: 500 },
          )
        }

        const templateData = {
          name: parsed.name,
          email: parsed.email,
          subject: parsed.subject,
          message: parsed.message,
        }

        const element = React.createElement(entry.component, templateData)
        const html = await render(element)
        const text = await render(element, { plainText: true })

        const resolvedSubject =
          typeof entry.subject === 'function'
            ? entry.subject(templateData)
            : entry.subject

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const messageId = crypto.randomUUID()

        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'contact-message',
          recipient_email: entry.to,
          status: 'pending',
        })

        const { error: enqueueError } = await supabase.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            message_id: messageId,
            to: entry.to,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: resolvedSubject,
            html,
            text,
            purpose: 'transactional',
            label: 'contact-message',
            reply_to: parsed.email,
            queued_at: new Date().toISOString(),
          },
        })

        if (enqueueError) {
          console.error('Failed to enqueue contact email', { error: enqueueError })
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: 'contact-message',
            recipient_email: entry.to,
            status: 'failed',
            error_message: 'Failed to enqueue email',
          })
          return Response.json(
            { error: 'Failed to send message' },
            { status: 500 },
          )
        }

        return Response.json({ success: true })
      },
    },
  },
})
