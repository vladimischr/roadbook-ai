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

interface WelcomeJ3NudgeProps {
  firstName?: string
  newUrl?: string
}

const WelcomeJ3NudgeEmail = ({
  firstName,
  newUrl,
}: WelcomeJ3NudgeProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      Pas encore de premier roadbook — un coup de main {firstName ? firstName : ''} ?
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {firstName ? `${firstName}, ` : ''}un coup de main ?
        </Heading>
        <Text style={text}>
          Tu t'es inscrit il y a quelques jours mais tu n'as pas encore créé
          ton premier roadbook. C'est peut-être parce que tu attends de
          tomber sur un vrai dossier client. Ou parce que tu hésites sur
          comment commencer.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Trois entrées possibles selon ton flow</Text>
          <Text style={item}>
            <strong>Tu pars d'une destination claire</strong> — tu remplis
            quelques champs (dates, profil voyageur, budget), on génère le
            plan complet.
          </Text>
          <Text style={item}>
            <strong>Tu as déjà un brouillon Notion ou Excel</strong> —
            importe-le, on le transforme en livrable propre.
          </Text>
          <Text style={item}>
            <strong>Tu veux tester sans risque</strong> — fais un faux
            dossier sur une destination que tu connais bien, juste pour
            voir le rendu.
          </Text>
        </Section>

        <Section style={ctaWrap}>
          <Button
            style={ctaButton}
            href={newUrl ?? `${SITE_URL}/new`}
          >
            Composer un roadbook
          </Button>
        </Section>

        <Text style={text}>
          Si tu veux qu'on regarde ensemble une destination spécifique,
          réponds à cet email avec le nom du lieu — on te montre ce que
          ça donne en 5 minutes.
        </Text>

        <Hr style={hr} />

        <Text style={signature}>
          {SITE_NAME} — pour les travel designers qui livrent autrement.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: WelcomeJ3NudgeEmail,
  subject: 'Un coup de main pour ton premier roadbook ?',
  displayName: 'Welcome J3 Nudge',
  previewData: {
    firstName: 'Camille',
    newUrl: `${SITE_URL}/new`,
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
  margin: '0 0 14px',
}
const item = {
  fontSize: '14px',
  color: '#333333',
  lineHeight: '1.6',
  margin: '0 0 12px',
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
const signature = {
  fontSize: '12px',
  color: '#999999',
  fontStyle: 'italic' as const,
  margin: '8px 0 0',
}
