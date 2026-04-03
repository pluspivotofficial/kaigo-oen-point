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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="ja" dir="ltr">
    <Head />
    <Preview>{siteName} - メールアドレスの確認</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>メールアドレスの確認</Heading>
        <Text style={text}>
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          にご登録いただきありがとうございます！
        </Text>
        <Text style={text}>
          以下のボタンをクリックして、メールアドレス（
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ）を確認してください。
        </Text>
        <Button style={button} href={confirmationUrl}>
          メールアドレスを確認する
        </Button>
        <Text style={footer}>
          アカウントを作成した覚えがない場合は、このメールを無視してください。
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
