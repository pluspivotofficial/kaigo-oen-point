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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="ja" dir="ltr">
    <Head />
    <Preview>{siteName} - メールアドレス変更の確認</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>メールアドレス変更の確認</Heading>
        <Text style={text}>
          {siteName} のメールアドレスを{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          から{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>{' '}
          へ変更するリクエストを受け付けました。
        </Text>
        <Text style={text}>
          以下のボタンをクリックして変更を確認してください。
        </Text>
        <Button style={button} href={confirmationUrl}>
          メールアドレスの変更を確認する
        </Button>
        <Text style={footer}>
          この変更をリクエストした覚えがない場合は、すぐにアカウントのセキュリティを確認してください。
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
