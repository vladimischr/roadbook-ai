import {
  Body,
  Button,
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
const SITE_URL = 'https://roadbook.ai'

interface WelcomeJ0Props {
  firstName?: string
  dashboardUrl?: string
}

const WelcomeJ0Email = ({
  firstName,
  dashboardUrl,
}: WelcomeJ0Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      Bienvenue sur {SITE_NAME} — ton premier roadbook en 6 minutes
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {firstName ? `Bienvenue ${firstName}` : 'Bienvenue'} sur Roadbook
        </Heading>
        <Text style={text}>
          Tu as créé ton compte. Tu peux maintenant transformer un itinéraire
          (Notion, Excel, Google Doc, ou même de tête) en roadbook digital
          présentable à ton client.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Ton premier roadbook en 3 étapes</Text>
          <Text style={step}>
            <strong>1.</strong> Donne-nous une destination, des dates, un profil de voyageur.
          </Text>
          <Text style={step}>
            <strong>2.</strong> On compose le plan jour par jour avec hébergements, distances et conseils sur place.
          </Text>
          <Text style={step}>
            <strong>3.</strong> Tu personnalises, tu exportes en PDF, tu envoies à ton client.
          </Text>
          <Text style={duration}>Temps moyen : 6 minutes.</Text>
        </Section>

        <Section style={ctaWrap}>
          <Button
            style={ctaButton}
            href={dashboardUrl ?? `${SITE_URL}/new`}
          >
            Composer mon premier roadbook
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Si tu cales sur quelque chose, réponds simplement à cet email — c'est l'équipe Roadbook qui lit.
        </Text>
        <Text style={signature}>
          {SITE_NAME} — pour les travel designers qui livrent autrement.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: WelcomeJ0Email,
  subject: 'Bienvenue sur Roadbook — ton premier roadbook en 6 minutes',
  displayName: 'Welcome J0',
  previewData: {
    firstName: 'Camille',
    dashboardUrl: `${SITE_URL}/new`,
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
}
const container = { padding: '32px 24px', maxWidth: '560px' }
const h1 = {
  fontSize: '24px',
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
const cardTitle = {
  fontSize: '15px',
  fontWeight: 700,
  color: '#111111',
  margin: '0 0 12px',
}
const step = {
  fontSize: '14px',
  color: '#333333',
  lineHeight: '1.6',
  margin: '0 0 8px',
}
const duration = {
  fontSize: '13px',
  color: '#8a7a3a',
  fontStyle: 'italic' as const,
  margin: '12px 0 0',
}
const ctaWrap = {
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const ctaButton = {
  backgroundColor: '#0a0908',
  color: '#fbfaf6',
  padding: '14px 28px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e6e1d6', margin: '24px 0 16px' }
const footer = {
  fontSize: '13px',
  color: '#666666',
  margin: '0 0 12px',
}
const signature = {
  fontSize: '12px',
  color: '#999999',
  fontStyle: 'italic' as const,
  margin: '8px 0 0',
}
