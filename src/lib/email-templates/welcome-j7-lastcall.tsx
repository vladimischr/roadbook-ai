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

interface WelcomeJ7LastCallProps {
  firstName?: string
  newUrl?: string
}

const WelcomeJ7LastCallEmail = ({
  firstName,
  newUrl,
}: WelcomeJ7LastCallProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      Une question avant qu'on s'efface — dis-nous ce qui te freine
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Une question avant qu'on s'efface</Heading>
        <Text style={text}>
          {firstName ? `${firstName}, ` : ''}ça fait une semaine que tu as
          créé ton compte sans avoir composé de roadbook. Pas de souci —
          on coupe les emails de suivi à partir de demain.
        </Text>
        <Text style={text}>
          Mais avant : <strong>qu'est-ce qui t'a fait reculer ?</strong>
        </Text>

        <Section style={card}>
          <Text style={option}>
            <strong>Pas le temps là maintenant</strong> — pas de souci,
            tu reviendras quand un vrai dossier se présentera. Le compte
            t'attendra.
          </Text>
          <Text style={option}>
            <strong>Le produit ne fait pas ce que je pensais</strong> —
            réponds à cet email avec ce que tu cherches, je te dis si
            c'est sur la roadmap ou si on n'est pas le bon outil pour toi.
          </Text>
          <Text style={option}>
            <strong>Le prix me freine</strong> — le tier gratuit reste là
            sans limite de temps (2 roadbooks par mois). Et si tu fais
            beaucoup de dossiers, le ROI arrive vite : ~3h gagnées par
            dossier livré.
          </Text>
          <Text style={option}>
            <strong>J'ai besoin d'aide pour démarrer</strong> — réponds
            "AIDE" à cet email, je prends 10 min avec toi en visio.
          </Text>
        </Section>

        <Section style={ctaWrap}>
          <Button
            style={ctaButton}
            href={newUrl ?? `${SITE_URL}/new`}
          >
            Faire un essai maintenant
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Tu peux te désinscrire des emails de suivi à tout moment. Ton
          compte reste actif tant que tu ne le supprimes pas explicitement.
        </Text>
        <Text style={signature}>
          {SITE_NAME} — pour les travel designers qui livrent autrement.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: WelcomeJ7LastCallEmail,
  subject: "Une question avant qu'on s'efface",
  displayName: 'Welcome J7 Last Call',
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
const option = {
  fontSize: '14px',
  color: '#333333',
  lineHeight: '1.6',
  margin: '0 0 14px',
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
  fontSize: '12px',
  color: '#999999',
  lineHeight: '1.5',
  margin: '0 0 12px',
}
const signature = {
  fontSize: '12px',
  color: '#999999',
  fontStyle: 'italic' as const,
  margin: '8px 0 0',
}
