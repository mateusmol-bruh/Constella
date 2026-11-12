import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Sheet } from './Social';
import { Button, Chip } from './ui';
import { Icon } from './Icon';
import { colors, ui } from '../styles/theme';

// Demonstração visual solicitada: sem API, dados bancários ou acesso Pro.
export function PaymentSimulation() {
  const [step, setStep] = useState<'closed' | 'checkout' | 'approved' | 'declined'>('closed');
  const [method, setMethod] = useState<'Pix' | 'Cartão'>('Pix');
  function start() { setMethod('Pix'); setStep('checkout'); }
  return <>
    <Button title="Simular pagamento" variant="secondary" onPress={start} />
    <Sheet visible={step !== 'closed'} title="Pagamento de demonstração" onClose={() => setStep('closed')}>
      <Text style={ui.muted}>SIMULAÇÃO · SEM COBRANÇA</Text>
      {step === 'checkout' && <>
        <Text style={ui.subtitle}>Constella Pro</Text>
        <Text style={ui.body}>Experimente o fluxo de pagamento com uma forma de teste.</Text>
        <View style={ui.wrap}>
          <Chip title="Pix de teste" selected={method === 'Pix'} onPress={() => setMethod('Pix')} />
          <Chip title="Cartão de teste" selected={method === 'Cartão'} onPress={() => setMethod('Cartão')} />
        </View>
        <View style={ui.card}>
          <Text style={ui.body}>Forma escolhida: {method} de teste</Text>
          <Text style={ui.body}>Valor: sem cobrança</Text>
          <Text style={ui.muted}>Não informe dados bancários. Esta demonstração não ativa a assinatura nem libera conteúdos exclusivos.</Text>
        </View>
        <Button title="Simular pagamento aprovado" onPress={() => setStep('approved')} />
        <Button title="Simular pagamento recusado" variant="secondary" small onPress={() => setStep('declined')} />
      </>}
      {step === 'approved' && <>
        <Icon name="check" color={colors.pink} size={36} />
        <Text accessibilityRole="alert" style={ui.subtitle}>Pagamento aprovado na simulação</Text>
        <Text style={ui.body}>O fluxo de teste foi concluído com {method}. Nenhuma cobrança foi realizada e sua assinatura real permanece inalterada.</Text>
        <Button title="Simular novamente" variant="secondary" onPress={start} />
      </>}
      {step === 'declined' && <>
        <Text accessibilityRole="alert" style={ui.subtitle}>Pagamento recusado na simulação</Text>
        <Text style={ui.body}>Este é um resultado de teste. Você pode voltar e tentar outra forma de pagamento demonstrativa.</Text>
        <Button title="Tentar novamente" onPress={() => setStep('checkout')} />
      </>}
    </Sheet>
  </>;
}
