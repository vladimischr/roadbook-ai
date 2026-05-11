import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'Roadbook.ai'

interface ContactMessageProps {
  name?: string
  email?: string
  message?: string
  subject?: string
}

const ContactMessageEmail = ({
  name,
  email,
  message,
  subject,
}: ContactMessageProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      Nouveau message de contact{name ? ` de ${name}` : ''}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nouveau message de contact</Heading>
        <Text style={text}>
          Un visiteur vient de remplir le formulaire de contact sur {SITE_NAME}.
        </Text>

        <Section style={card}>
          <Text style={label}>Nom</Text>
          <Text style={value}>{name || '—'}</Text>

          <Hr style={hr} />

          <Text style={label}>Email</Text>
          <Text style={value}>{email || '—'}</Text>

          {subject ? (
            <>
              <Hr style={hr} />
              <Text style={label}>Sujet</Text>
              <Text style={value}>{subject}</Text>
            </>
          ) : null}

          <Hr style={hr} />

          <Text style={label}>Message</Text>
          <Text style={{ ...value, whiteSpace: 'pre-wrap' }}>
            {message || '—'}
          </Text>
        </Section>

        <Text style={footer}>
          Vous pouvez répondre directement à {email || 'cet expéditeur'} pour
          poursuivre la conversation.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactMessageEmail,
  subject: (data: Record<string, any>) =>
    `Contact ${SITE_NAME}${data?.name ? ` — ${data.name}` : ''}`,
  displayName: 'Message de contact',
  to: 'vladimir@brakial.com',
  previewData: {
    name: 'Camille Dupont',
    email: 'camille@example.com',
    subject: 'Question sur les abonnements',
    message: 'Bonjour, j’aimerais en savoir plus sur l’offre Pro.',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
}
const container = { padding: '32px 24px', maxWidth: '560px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#111111',
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const card = {
  backgroundColor: '#f7f4ed',
  borderRadius: '8px',
  padding: '20px 24px',
  margin: '0 0 24px',
}
const label = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  color: '#8a8a8a',
  margin: '0 0 4px',
  fontWeight: 600,
}
const value = {
  fontSize: '14px',
  color: '#111111',
  lineHeight: '1.5',
  margin: '0 0 4px',
}
const hr = { borderColor: '#e6e1d6', margin: '16px 0' }
const footer = {
  fontSize: '12px',
  color: '#999999',
  margin: '24px 0 0',
}
