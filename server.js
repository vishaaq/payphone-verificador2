// server.js
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/verificar-pago', async (req, res) => {
  const transactionId = req.query.id;

  if (!transactionId) {
    return res.status(400).send('Falta transactionId');
  }

  try {
    const confirmRes = await fetch('https://pay.payphonetodoesposible.com/api/button/V2/Confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYPHONE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: parseInt(transactionId, 10) })
    });

    const confirmData = await confirmRes.json();

    if (confirmData.statusCode === 3 && confirmData.transactionStatus === 'Approved') {
      const ref = confirmData.reference || '';
      const userId = ref.split('_')[1];

      if (!userId) {
        return res.status(400).send('No se pudo extraer el userId de la referencia');
      }

      const activarRes = await fetch(`${process.env.REPLIT_ACTIVAR_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          transactionId: confirmData.transactionId,
          authorizationCode: confirmData.authorizationCode,
          amount: confirmData.amount,
        })
      });

      if (activarRes.ok) {
        return res.send(`✅ Pago confirmado y usuario ${userId} activado.`);
      } else {
        return res.status(502).send('Pago confirmado, pero error activando usuario en Replit.');
      }
    } else {
      return res.send('❌ Pago no aprobado o status inválido.');
    }
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).send('Error interno verificando el pago.');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
