
import { NextRequest, NextResponse } from 'next/server';
import { beginCell, toNano, Address } from "@ton/core";
import nacl from "tweetnacl";
import { Buffer } from "buffer";

export async function POST(req: NextRequest) {
  const { userAddress } = await req.json();

  if (!userAddress) {
    return NextResponse.json({ error: 'Missing userAddress' }, { status: 400 });
  }

  // 1. Cargar la clave secreta de forma segura desde las variables de entorno
  const backendSecretKey = Buffer.from(process.env.BACKEND_SECRET_KEY!, 'hex');

  // --- Lógica de Negocio ---
  // 2. Verifica si el usuario (userAddress) merece una recompensa.
  // Por ejemplo, consultando una base de datos.
  const isEligible = true; // Reemplazar con tu lógica real
  if (!isEligible) {
    return NextResponse.json({ error: "User not eligible for reward." }, { status: 403 });
  }

  // 3. Define los parámetros de la recompensa
  const rewardAmount = toNano("100"); // 100 tokens
  const validUntil = Math.floor(Date.now() / 1000) + 300; // Válido por 5 minutos

  // 4. Genera un nonce único para evitar ataques de repetición.
  // Puede ser un hash de datos únicos o un contador.
  const nonceBuffer = beginCell().storeAddress(Address.parse(userAddress)).storeUint(Date.now(), 64).endCell().hash();
  const nonce = BigInt('0x' + nonceBuffer.toString('hex'));

  // 5. Construye la celda de datos que se firmará
  const dataToSign = beginCell()
    .storeAddress(Address.parse(userAddress))
    .storeCoins(rewardAmount)
    .storeUint(validUntil, 32)
    .storeUint(nonce, 256)
    .endCell();

  // 6. Firma el hash de la celda con la clave secreta
  const signature = nacl.sign.detached(dataToSign.hash(), backendSecretKey);

  // 7. Devuelve los datos al frontend
  return NextResponse.json({
    rewardAmount: rewardAmount.toString(),
    validUntil: validUntil,
    nonce: '0x' + nonce.toString(16), // Enviar como string hexadecimal
    signature: Buffer.from(signature).toString('hex') // Enviar como string hexadecimal
  });
}
