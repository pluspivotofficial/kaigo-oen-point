/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="ja" dir="ltr">
    <Head />
    <Preview>{siteName} への招待</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>招待を受けました</Heading>
        <Text style={text}>
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          への招待が届いています。以下のボタンをクリックして招待を承諾し、アカウントを作成してください。
        </Text>
        <Button style={button} href={confirmationUrl}>
          招待を承諾する
        </Button>
        <Text style={footer}>
          この招待に覚えがない場合は、このメールを無視してください。
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(220, 20%, 15%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(220, 10%, 45%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(356, 82%, 72%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
