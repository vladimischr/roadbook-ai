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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
<<<<<<< HEAD
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Ton lien de connexion à {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Ton lien de connexion</Heading>
        <Text style={text}>
          Clique sur le bouton ci-dessous pour te connecter à {siteName}. Aucun mot de passe nécessaire.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Me connecter
        </Button>
        <Text style={text}>
          <strong>Ce lien est valable 24 heures</strong> et ne peut être utilisé qu'une seule fois.
        </Text>
        <Text style={footer}>
          Tu reçois cet email parce qu'une connexion à Roadbook.ai a été demandée avec ton adresse. Si tu n'es pas à l'origine de cette demande, ignore simplement ce message.
          <br /><br />
          — L'équipe Roadbook.ai
=======
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>
          Click the button below to log in to {siteName}. This link will expire
          shortly.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Log In
        </Button>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
>>>>>>> 427df08072d5b09b2dcde4bb85d6993470d4f624
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
