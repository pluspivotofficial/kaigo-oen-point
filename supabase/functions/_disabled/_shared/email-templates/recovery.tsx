/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="ja" dir="ltr">
    <Head />
    <Preview>{siteName} - パスワードのリセット</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>パスワードのリセット</Heading>
        <Text style={text}>
          {siteName} のパスワードリセットのリクエストを受け付けました。以下のボタンをクリックして、新しいパスワードを設定してください。
        </Text>
        <Button style={button} href={confirmationUrl}>
          パスワードをリセットする
        </Button>
        <Text style={footer}>
          パスワードリセットをリクエストした覚えがない場合は、このメールを無視してください。パスワードは変更されません。
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
const button = {
  backgroundColor: 'hsl(356, 82%, 72%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
