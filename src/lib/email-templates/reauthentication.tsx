import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
<<<<<<< HEAD
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Ton code de vérification Roadbook.ai</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirme ton identité</Heading>
        <Text style={text}>
          Pour des raisons de sécurité, nous devons vérifier que c'est bien toi. Utilise le code ci-dessous pour confirmer ton identité :
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={text}>
          <strong>Ce code expire dans quelques minutes</strong> et ne peut être utilisé qu'une seule fois.
        </Text>
        <Text style={footer}>
          Tu reçois cet email parce qu'une action sensible a été demandée sur ton compte Roadbook.ai. Si tu n'es pas à l'origine de cette demande, ignore ce message et envisage de changer ton mot de passe.
          <br /><br />
          — L'équipe Roadbook.ai
=======
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
>>>>>>> 427df08072d5b09b2dcde4bb85d6993470d4f624
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
