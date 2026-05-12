import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Réinitialise ton mot de passe {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Réinitialise ton mot de passe</Heading>
        <Text style={text}>
          Nous avons reçu une demande de réinitialisation de mot de passe pour ton compte {siteName}. Clique sur le bouton ci-dessous pour en choisir un nouveau.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Choisir un nouveau mot de passe
        </Button>
        <Text style={text}>
          <strong>Ce lien est valable 24 heures.</strong> Au-delà, tu devras refaire une demande.
        </Text>
        <Text style={footer}>
          Tu reçois cet email parce qu'une réinitialisation de mot de passe a été demandée pour ton compte Roadbook.ai. Si tu n'es pas à l'origine de cette demande, ignore ce message — ton mot de passe restera inchangé.
          <br /><br />
          — L'équipe Roadbook.ai
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
