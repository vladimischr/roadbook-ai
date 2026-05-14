import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
import { template as contactMessage } from './contact-message'
import { template as welcomeJ0 } from './welcome-j0'
import { template as welcomeJ3Nudge } from './welcome-j3-nudge'
import { template as welcomeJ7LastCall } from './welcome-j7-lastcall'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contact-message': contactMessage,
  'welcome-j0': welcomeJ0,
  'welcome-j3-nudge': welcomeJ3Nudge,
  'welcome-j7-lastcall': welcomeJ7LastCall,
}
