import {
  AccountMeta,
  Connection,
  LAMPORTS_PER_SOL,
  MemcmpFilter,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  Token,
} from "@solana/spl-token";

import * as bs58 from "bs58";
import { serialize, deserialize, deserializeUnchecked, } from 'borsh';
/* global BigInt */

export const PROGRAM_ID = new PublicKey(
  "BwqsFQnwCCU1drjXVoMLnicBuFxLPJBhH2fqRArghsRc"
);

 const FEES_VAULT = new PublicKey(
  "AgiQRZnoTHLc8SZjRRz47M6CQkMMjf1huPinrphSSqSD"
)

class Assignable {
  constructor(properties) {
    Object.keys(properties).map((key) => {
      return (this[key] = properties[key]);
    });
  }
}
class Payload extends Assignable {}


function createInstructionData(instruction: string, vault_word:String, amount, deposit): any {
  
  const singlePayloadSchema = new Map([
    [
      Payload,
      {
        kind: "struct",
        fields: [
          ["id", "u8"],
          ["escrow_vault_word", "string"]
        ],
      },
    ],
  ]);
  const amountPayloadSchema = new Map([
    [
      Payload,
      {
        kind: "struct",
        fields: [
          ["id", "u8"],
          ["amount", "u64"]
        ],
      },
    ],
  ]);
  const payloadSchema = new Map([
    [
      Payload,
      {
        kind: "struct",
        fields: [
          ["id", "u8"],
          ["amount", "u64"],
          ["deposit", "u64"],
          ["escrow_vault_word", "string"]
        ],
      },
    ],
  ]);
  if (instruction === "EscrowInit"){
    const Data = new Payload({
      id:0,
      amount:amount,
      deposit:deposit,
      escrow_vault_word: vault_word
      });
    return Buffer.from(serialize(payloadSchema ,Data));
  } 
  else if (instruction === "EscrowValidate"){
    const Data = new Payload({
      id:1,
      escrow_vault_word: vault_word
      });
    return Buffer.from(serialize(singlePayloadSchema ,Data));
  } 
  else if (instruction === "InitiatorWithdraw"){
    const Data = new Payload({
      id:9,
      escrow_vault_word: vault_word
      });
    return Buffer.from(serialize(singlePayloadSchema ,Data));
  } 
  else if (instruction === "EscrowApprove"){
    const Data = new Payload({
      id:2,
      escrow_vault_word: vault_word
      });
    return Buffer.from(serialize(singlePayloadSchema ,Data));
  } 
  else if (instruction === "SPLEscrowInit"){
    const Data = new Payload({
      id:5,
      amount:amount,
      deposit:deposit,
      escrow_vault_word: vault_word
      });
    return Buffer.from(serialize(payloadSchema ,Data));
  } 
  else if (instruction === "SPLEscrowValidate"){

    const Data = new Payload({
      id:6,
      escrow_vault_word: vault_word
      });
    return Buffer.from(serialize(singlePayloadSchema ,Data));
  } 
  else if (instruction === "SPLInitiatorWithdraw"){
    const Data = new Payload({
      id:10,
      escrow_vault_word: vault_word
      });
    return Buffer.from(serialize(singlePayloadSchema ,Data));
  } 
  else if (instruction === "SPLEscrowApprove"){

    const Data = new Payload({
      id:7,
      escrow_vault_word: vault_word
      });
    return Buffer.from(serialize(singlePayloadSchema ,Data));
  } 
  else if (instruction === "VaultXDeposit"){

    const Data = new Payload({
      id:13,
      amount: amount
      });
    return Buffer.from(serialize(amountPayloadSchema ,Data));
  } 
  throw new Error(`Unrecognized instruction: ${instruction}`);
}

function parseUint64Le(data: Uint8Array, offset: number = 0): bigint {
  let number = BigInt(0);
  for (let i = 0; i < 8; i++)
    number += BigInt(data[offset + i]) << BigInt(i * 8);
  return number;
}

function getAssociatedTokenAddress(
  walletAddress: PublicKey,
  tokenAddress: PublicKey,
  allowOffCurve: boolean = false
): Promise<PublicKey> {
  return Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    tokenAddress,
    walletAddress,
    allowOffCurve
  );
}

function transactionKey(
  pubkey: PublicKey,
  isSigner: boolean,
  isWritable: boolean = true
): AccountMeta {
  return {
    pubkey,
    isSigner,
    isWritable,
  };
}

export async function getEscrowVaultAddress(
  escrowVaultWord:String
): Promise<PublicKey> {
  let [address] = await PublicKey.findProgramAddress(
    [Buffer.from(escrowVaultWord)],
    PROGRAM_ID
  );
  return address;
}

export async function getEscrowDataAddress(
  escrowVaultWord: String
): Promise<PublicKey> {
  let [address] = await PublicKey.findProgramAddress(
    [Buffer.from(escrowVaultWord)],
    PROGRAM_ID
  );
  return address;
}

const WHITELIST_PREFIX = "whitelist";
export async function getWhitelistDataAddress(
  candyMachine: PublicKey
): Promise<PublicKey> {
  let [address] = await PublicKey.findProgramAddress(
    [Buffer.from(WHITELIST_PREFIX), candyMachine.toBytes()],
    PROGRAM_ID
  );
  return address;
}

export async function printEscrowData(
  connection: Connection,
  escrow_vault_word: String
): Promise<any> {
  let vaultAddress = await getEscrowDataAddress(escrow_vault_word);
  let valutAccountInfo = await connection.getAccountInfo(vaultAddress);
  if (!valutAccountInfo) throw new Error(`${vaultAddress} not initialized`);
  let { data } = valutAccountInfo;

  return {
    timestamp: parseUint64Le(data, 0),
    buyer: (new PublicKey(data.slice(8, 40))).toBase58(),
    seller:( new PublicKey(data.slice(40, 72))).toBase58(),
    active: new TextDecoder("utf-8").decode(data.slice(72,73)),
    deposit: parseUint64Le(data, 73),
    amount: parseUint64Le(data, 79),
    is_initiator_buyer:  (new PublicKey(data.slice(80, 81))).toBase58()
  };
}

export async function createEscrowInitTransaction(
  connection: Connection,
  initiator: PublicKey,
  validator: PublicKey,
  escrowVaultWord:String,
  amount:any,
  deposit:any
): Promise<Transaction> {

  let transaction = new Transaction();
  transaction.add(
    await createEscrowInitInstruction(
      initiator,
      validator,
      escrowVaultWord,
      amount,
      deposit,
    )
  );
  return transaction;
}
export async function createEscrowInitInstruction(
  initiator: PublicKey,
  validator:PublicKey,
  escrowVaultWord:String,
  amount:any,
  deposit:any,
): Promise<TransactionInstruction> {

    let escrowDataAddress = await getEscrowDataAddress(escrowVaultWord);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    data: createInstructionData("EscrowInit", escrowVaultWord, amount, deposit),
    keys: [
      transactionKey(initiator, true),
      transactionKey(validator, false, false),

      transactionKey(SystemProgram.programId, false, false),
      transactionKey(SYSVAR_RENT_PUBKEY, false, false),

      transactionKey(escrowDataAddress, false),
    ],
  });
}

export async function createEscrowValidateTransaction(
  connection: Connection,
  validator: PublicKey,
  initiator: PublicKey,
  escrowVaultWord:String,
): Promise<Transaction> {

  let transaction = new Transaction();
  transaction.add(
    await createEscrowValidateInstruction(
      validator,
      initiator,
      escrowVaultWord,
    )
  );
  return transaction;
}
export async function createEscrowValidateInstruction(
  validator:PublicKey,
  initiator: PublicKey,
  escrowVaultWord:String,

): Promise<TransactionInstruction> {

    let escrowDataAddress = await getEscrowDataAddress(escrowVaultWord);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    data: createInstructionData("EscrowValidate", escrowVaultWord,null, null),
    keys: [
      transactionKey(validator, true),
      transactionKey(initiator, false, false),

      transactionKey(SystemProgram.programId, false, false),
      transactionKey(SYSVAR_RENT_PUBKEY, false, false),

      transactionKey(escrowDataAddress, false, true),
    ],
  });
}


export async function createInitiatorWithdrawTransaction(
  connection: Connection,
  initiator: PublicKey,
  validator: PublicKey,
  escrowVaultWord:String,
): Promise<Transaction> {

  let transaction = new Transaction();
  transaction.add(
    await createInitiatorWithdrawInstruction(
      initiator,
      validator,
      escrowVaultWord,
    )
  );
  return transaction;
}
export async function createInitiatorWithdrawInstruction(
  initiator: PublicKey,
  validator:PublicKey,
  escrowVaultWord:String,

): Promise<TransactionInstruction> {

    let escrowDataAddress = await getEscrowDataAddress(escrowVaultWord);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    data: createInstructionData("InitiatorWithdraw", escrowVaultWord,null, null),
    keys: [
      transactionKey(initiator, true),
      transactionKey(validator, false, false),

      transactionKey(SystemProgram.programId, false, false),
      transactionKey(SYSVAR_RENT_PUBKEY, false, false),

      transactionKey(escrowDataAddress, false, true),
    ],
  });
}


export async function createEscrowApproveTransaction(
  connection: Connection,
  buyer: PublicKey,
  seller: PublicKey,
  escrowVaultWord:String,
): Promise<Transaction> {

  let transaction = new Transaction();
  transaction.add(
    await createEscrowApproveInstruction(
      buyer,
      seller,
      escrowVaultWord,
    )
  );
  return transaction;
}
export async function createEscrowApproveInstruction(
  buyer:PublicKey,
  seller: PublicKey,
  escrowVaultWord:String,

): Promise<TransactionInstruction> {

    let escrowDataAddress = await getEscrowDataAddress(escrowVaultWord);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    data: createInstructionData("EscrowApprove", escrowVaultWord,null, null),
    keys: [
      transactionKey(buyer, true),
      transactionKey(seller, false, true),
      transactionKey(FEES_VAULT, false, true),

      transactionKey(SystemProgram.programId, false, false),
      transactionKey(SYSVAR_RENT_PUBKEY, false, false),

      transactionKey(escrowDataAddress, false, true),
    ],
  });
}


export async function createSPLEscrowInitTransaction(
  connection: Connection,
  initiator: PublicKey,
  validator: PublicKey,
  token: PublicKey,
  escrowVaultWord:String,
  amount:any,
  deposit:any
): Promise<Transaction> {


  let sourceTokenAccount = null;


  let transaction = new Transaction();
  transaction.add(
    await createSPLEscrowInitInstruction(
      initiator,
      validator,
      token,
      escrowVaultWord,
      amount,
      deposit,
      sourceTokenAccount,
    )
  );

  // let primarySourceTokenAccount = await getAssociatedTokenAddress(owner, token);
  // if (!primarySourceTokenAccount.equals(sourceTokenAccount))
  //   transaction.add(
  //     Token.createCloseAccountInstruction(
  //       TOKEN_PROGRAM_ID,
  //       sourceTokenAccount,
  //       primarySourceTokenAccount,
  //       owner,
  //       []
  //     )
  //   );

  return transaction;
}
export async function createSPLEscrowInitInstruction(
  initiator: PublicKey,
  validator:PublicKey,
  token: PublicKey,
  escrowVaultWord:String,
  amount:any,
  deposit:any,
  sourceTokenAccount?: PublicKey,
): Promise<TransactionInstruction> {
  if (!sourceTokenAccount)
    sourceTokenAccount = await getAssociatedTokenAddress(initiator, token);
    let escrowDataAddress = await getEscrowDataAddress(escrowVaultWord);
  let destinationTokenAccount = await getAssociatedTokenAddress(
    escrowDataAddress,
    token,
    true
  );

  console.log(sourceTokenAccount.toString()," ", destinationTokenAccount.toString())

  let whitelistDataAddress = await getWhitelistDataAddress(token);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    data: createInstructionData("SPLEscrowInit", escrowVaultWord, amount, deposit),
    keys: [
      transactionKey(initiator, true),
      transactionKey(validator, false, false),
      transactionKey(token, false, false),

      transactionKey(sourceTokenAccount, false),
      transactionKey(destinationTokenAccount, false),

      transactionKey(TOKEN_PROGRAM_ID, false, false),
      transactionKey(SystemProgram.programId, false, false),
      transactionKey(SYSVAR_RENT_PUBKEY, false, false),
      transactionKey(ASSOCIATED_TOKEN_PROGRAM_ID, false, false),

      transactionKey(escrowDataAddress, false),
      transactionKey(whitelistDataAddress, false),
    ],
  });
}


export async function createSPLEscrowValidateTransaction(
  connection: Connection,
  validator: PublicKey,
  initiator: PublicKey,
  token: PublicKey,
  escrowVaultWord:String,
): Promise<Transaction> {


  let sourceTokenAccount = null;


  let transaction = new Transaction();
  transaction.add(
    await createSPLEscrowValidateInstruction(
      validator,
      initiator,
      token,
      escrowVaultWord,
      sourceTokenAccount,
    )
  );

  // let primarySourceTokenAccount = await getAssociatedTokenAddress(owner, token);
  // if (!primarySourceTokenAccount.equals(sourceTokenAccount))
  //   transaction.add(
  //     Token.createCloseAccountInstruction(
  //       TOKEN_PROGRAM_ID,
  //       sourceTokenAccount,
  //       primarySourceTokenAccount,
  //       owner,
  //       []
  //     )
  //   );

  return transaction;
}
export async function createSPLEscrowValidateInstruction(
  validator:PublicKey,
  initiator: PublicKey,
  token: PublicKey,
  escrowVaultWord:String,
  sourceTokenAccount?: PublicKey,
): Promise<TransactionInstruction> {
  if (!sourceTokenAccount)
    sourceTokenAccount = await getAssociatedTokenAddress(validator, token);
    let escrowDataAddress = await getEscrowDataAddress(escrowVaultWord);
  let destinationTokenAccount = await getAssociatedTokenAddress(
    escrowDataAddress,
    token,
    true
  );

  console.log(sourceTokenAccount.toString()," ", destinationTokenAccount.toString())

  let whitelistDataAddress = await getWhitelistDataAddress(token);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    data: createInstructionData("SPLEscrowValidate", escrowVaultWord, null, null),
    keys: [
      transactionKey(validator, true),
      transactionKey(initiator, false, false),
      transactionKey(token, false, false),

      transactionKey(sourceTokenAccount, false),
      transactionKey(destinationTokenAccount, false),

      transactionKey(TOKEN_PROGRAM_ID, false, false),
      transactionKey(SystemProgram.programId, false, false),
      transactionKey(SYSVAR_RENT_PUBKEY, false, false),
      transactionKey(ASSOCIATED_TOKEN_PROGRAM_ID, false, false),

      transactionKey(escrowDataAddress, false),
      transactionKey(whitelistDataAddress, false),
    ],
  });
}
export async function createSPLInitiatorWithdrawTransaction(
  connection: Connection,
  initiator: PublicKey,
  validator: PublicKey,
  token: PublicKey,
  escrowVaultWord:String,
): Promise<Transaction> {


  let sourceTokenAccount = null;


  let transaction = new Transaction();
  transaction.add(
    await createSPLInitiatorWithdrawInstruction(
      initiator,
      validator,
      token,
      escrowVaultWord,
    )
  );

  // let primarySourceTokenAccount = await getAssociatedTokenAddress(owner, token);
  // if (!primarySourceTokenAccount.equals(sourceTokenAccount))
  //   transaction.add(
  //     Token.createCloseAccountInstruction(
  //       TOKEN_PROGRAM_ID,
  //       sourceTokenAccount,
  //       primarySourceTokenAccount,
  //       owner,
  //       []
  //     )
  //   );

  return transaction;
}
export async function createSPLInitiatorWithdrawInstruction(
  initiator: PublicKey,
  validator:PublicKey,
  token: PublicKey,
  escrowVaultWord:String,
  sourceTokenAccount?: PublicKey,
): Promise<TransactionInstruction> {
  let destinationTokenAccount = await getAssociatedTokenAddress(initiator, token);
  let escrowDataAddress = await getEscrowDataAddress(escrowVaultWord);
  if (!sourceTokenAccount){
     sourceTokenAccount = await getAssociatedTokenAddress(
      escrowDataAddress,
      token,
      true
    );

  }

  console.log(sourceTokenAccount.toString()," ", destinationTokenAccount.toString())

  let whitelistDataAddress = await getWhitelistDataAddress(token);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    data: createInstructionData("SPLInitiatorWithdraw", escrowVaultWord, null, null),
    keys: [
      transactionKey(initiator, true),
      transactionKey(validator, false, false),
      transactionKey(token, false, false),

      transactionKey(sourceTokenAccount, false),
      transactionKey(destinationTokenAccount, false),

      transactionKey(TOKEN_PROGRAM_ID, false, false),
      transactionKey(SystemProgram.programId, false, false),
      transactionKey(SYSVAR_RENT_PUBKEY, false, false),
      transactionKey(ASSOCIATED_TOKEN_PROGRAM_ID, false, false),

      transactionKey(escrowDataAddress, false),
      transactionKey(whitelistDataAddress, false),
    ],
  });
}


export async function createSPLEscrowApproveTransaction(
  connection: Connection,
  buyer: PublicKey,
  seller: PublicKey,
  token: PublicKey,
  escrowVaultWord:String,
): Promise<Transaction> {


  let sourceTokenAccount = null;


  let transaction = new Transaction();
  transaction.add(
    await createSPLEscrowApproveInstruction(
      buyer,
      seller,
      token,
      escrowVaultWord,
      sourceTokenAccount,
    )
  );

  // let primarySourceTokenAccount = await getAssociatedTokenAddress(owner, token);
  // if (!primarySourceTokenAccount.equals(sourceTokenAccount))
  //   transaction.add(
  //     Token.createCloseAccountInstruction(
  //       TOKEN_PROGRAM_ID,
  //       sourceTokenAccount,
  //       primarySourceTokenAccount,
  //       owner,
  //       []
  //     )
  //   );

  return transaction;
}
export async function createSPLEscrowApproveInstruction(
  buyer:PublicKey,
  seller: PublicKey,
  token: PublicKey,
  escrowVaultWord:String,
  sourceTokenAccount?: PublicKey,
): Promise<TransactionInstruction> {
  let destinationTokenAccount = await getAssociatedTokenAddress(seller, token);
  let feeDestinationTokenAccount = await getAssociatedTokenAddress(FEES_VAULT, token);
  let escrowDataAddress = await getEscrowDataAddress(escrowVaultWord);
  if (!sourceTokenAccount){
     sourceTokenAccount = await getAssociatedTokenAddress(
      escrowDataAddress,
      token,
      true
    );

  }

  console.log(sourceTokenAccount.toString()," ", destinationTokenAccount.toString())

  let whitelistDataAddress = await getWhitelistDataAddress(token);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    data: createInstructionData("SPLEscrowApprove", escrowVaultWord, null, null),
    keys: [
      transactionKey(buyer, true),
      transactionKey(seller, false, true),
      transactionKey(FEES_VAULT, false, true),
      transactionKey(token, false, false),

      transactionKey(sourceTokenAccount, false, true),
      transactionKey(destinationTokenAccount, false, true),
      transactionKey(feeDestinationTokenAccount, false, true),

      transactionKey(TOKEN_PROGRAM_ID, false, false),
      transactionKey(SystemProgram.programId, false, false),
      transactionKey(SYSVAR_RENT_PUBKEY, false, false),
      transactionKey(ASSOCIATED_TOKEN_PROGRAM_ID, false, false),

      transactionKey(escrowDataAddress, false, true),
      transactionKey(whitelistDataAddress, false, true),
    ],
  });
}

export async function createDepositVaultXTransaction(
  connection: Connection,
  initiator: PublicKey,
  token: PublicKey,
  amount:any,
): Promise<Transaction> {
  let sourceTokenAccount = null;

  let transaction = new Transaction();
  transaction.add(
    await createDepositVaultXInstruction(
      initiator,
      token,
      amount,
      sourceTokenAccount,
    )
  );

  return transaction;
}
export async function createDepositVaultXInstruction(
  initiator: PublicKey,
  token: PublicKey,
  amount:any,
  sourceTokenAccount?: PublicKey,
): Promise<TransactionInstruction> {
  if (!sourceTokenAccount)
    sourceTokenAccount = await getAssociatedTokenAddress(initiator, token);
    let destinationTokenAccount = await getAssociatedTokenAddress(FEES_VAULT, token);

  console.log(sourceTokenAccount.toString()," ", destinationTokenAccount.toString())

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    data: createInstructionData("VaultXDeposit", "", amount, null),
    keys: [
      transactionKey(initiator, true),
      transactionKey(FEES_VAULT, false, true),

      transactionKey(token, false, false),

      transactionKey(sourceTokenAccount, false),
      transactionKey(destinationTokenAccount, false),

      transactionKey(TOKEN_PROGRAM_ID, false, false),
      transactionKey(SystemProgram.programId, false, false),
      transactionKey(SYSVAR_RENT_PUBKEY, false, false),
      transactionKey(ASSOCIATED_TOKEN_PROGRAM_ID, false, false),
    ],
  });
}

