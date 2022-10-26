import React, { FC, useCallback, useEffect, useReducer, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";


import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  createEscrowInitTransaction,
  createEscrowValidateTransaction,
  createEscrowApproveTransaction,
  createInitiatorWithdrawTransaction,
  createSPLEscrowInitTransaction,
  createSPLEscrowValidateTransaction,
  createSPLEscrowApproveTransaction,
  createSPLInitiatorWithdrawTransaction,
  createDepositVaultXTransaction,
  printEscrowData
} from "./util/escrow";

export const Navigation: FC = () => {
  const { connection } = useConnection();
  const {wallet, publicKey, sendTransaction } = useWallet();

  const [refreshHandle, forceRefresh] = useReducer((x) => !x, true);


  // useEffect(() => {
    const sendAndConfirmTransaction = useCallback(
      async (transaction) => {
        let { blockhash } = await connection.getRecentBlockhash();
        transaction.feePayer = publicKey!;
        transaction.recentBlockhash = blockhash;
  
        let signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, "confirmed");
  
        console.log(signature);
  
        // if (onChange) onChange();
  
        return signature;
      },
      [connection, publicKey, sendTransaction]
    );
    
    const validator = new PublicKey("8kQXBqHUa5Jaj1khGpdz73nYRCLtUtFviFnVui1RohVJ"); 
    const initiator = new PublicKey("JeJNxLLBLY7qhkFWEJbyETCf1nL2R85u91oQyxxqxgh");
    const address = new PublicKey("wEEdop2S1t7TLLeikEJ3awAWq9ty6wmf9v8wiS7beBB");
    const escrowVaultWord = "mainnetforgewithtest";
    const amount = 1000000000; // Adjust for SPL decimals
    const deposit = 1000000000; // Adjust for SPL decimals

    const getEscrowData = useCallback(
      async () => {
        if (!publicKey) return;
        let data = await (printEscrowData(connection, escrowVaultWord));
        console.log(data);
            },
      [connection, publicKey]
    );

    // If Buyer is creating deposit = amount
    // If Seller is creating deposit = 0
    const EscrowInit = useCallback(
      async () => {
        if (!publicKey) return;
        await sendAndConfirmTransaction(
          await createEscrowInitTransaction(connection, publicKey, validator, escrowVaultWord, amount, deposit )
        );
      },
      [connection, publicKey, sendAndConfirmTransaction]
    );

    const EscrowValidate = useCallback(
      async () => {
        if (!publicKey) return;
        await sendAndConfirmTransaction(
          await createEscrowValidateTransaction(connection, publicKey, initiator, escrowVaultWord)
        );
      },
      [connection, publicKey, sendAndConfirmTransaction]
    );

    const InitiatorWithdraw = useCallback(
      async () => {
        if (!publicKey) return;
        await sendAndConfirmTransaction(
          await createInitiatorWithdrawTransaction(connection, publicKey, validator, escrowVaultWord)
        );
      },
      [connection, publicKey, sendAndConfirmTransaction]
    );
    const EscrowApprove = useCallback(
      async () => {
        if (!publicKey) return;
        await sendAndConfirmTransaction(
          await createEscrowApproveTransaction(connection, publicKey, validator, escrowVaultWord)
        );
      },
      [connection, publicKey, sendAndConfirmTransaction]
    );

    const splEscrowInit = useCallback(
      async () => {
        if (!publicKey) return;
        await sendAndConfirmTransaction(
          await createSPLEscrowInitTransaction(connection, publicKey, validator,address, escrowVaultWord, amount, deposit )
        );
      },
      [connection, publicKey, sendAndConfirmTransaction]
    );
    const splEscrowValidate = useCallback(
      async () => {
        if (!publicKey) return;
        await sendAndConfirmTransaction(
          await createSPLEscrowValidateTransaction(connection, publicKey, initiator,address, escrowVaultWord)
        );
      },
      [connection, publicKey, sendAndConfirmTransaction]
    );
    const SPLInitiatorWithdraw = useCallback(
      async () => {
        if (!publicKey) return;
        await sendAndConfirmTransaction(
          await createSPLInitiatorWithdrawTransaction(connection, publicKey, validator,address, escrowVaultWord)
        );
      },
      [connection, publicKey, sendAndConfirmTransaction]
    );
    const splEscrowApprove = useCallback(
      async () => {
        if (!publicKey) return;
        await sendAndConfirmTransaction(
          await createSPLEscrowApproveTransaction(connection, publicKey, validator,address, escrowVaultWord)
        );
      },
      [connection, publicKey, sendAndConfirmTransaction]
    );
    const depositVaultX = useCallback(
      async () => {
        if (!publicKey) return;
        await sendAndConfirmTransaction(
          await createDepositVaultXTransaction(connection, publicKey, address,amount)
        );
      },
      [connection, publicKey, sendAndConfirmTransaction]
    );
    return (
      <>
        <nav>
          <h1>Escrow Program</h1>
          <div>
            <WalletMultiButton />
            {wallet && <WalletDisconnectButton />}
          </div>
        </nav>
  
        <h2>SOL Escrow Program</h2>
        <section className="card-grid">
          <button onClick={() => EscrowInit()}>SOL Escrow Init</button>
          <button onClick={() => EscrowValidate()}>SOL Escrow Validate Contract</button>
          <button onClick={() => EscrowApprove()}>SOL Escrow Approve Payment</button>
          <button onClick={() => InitiatorWithdraw()}>Initiator Contract Withdraw</button>
        </section>
          <button onClick={() => getEscrowData()}>Get escrow data</button>
  
        <h2>SPL Escrow Programs</h2>
        <section className="card-grid">

          <button onClick={() => splEscrowInit()}>SPL Escrow Init</button>
          <button onClick={() => splEscrowValidate()}>SPL Escrow Validate</button>
          <button onClick={() => splEscrowApprove()}>SPL Escrow Approve Payment</button>
          <button onClick={() => SPLInitiatorWithdraw()}>SPL Initiator Contract Withdraw</button>
          <button onClick={() => depositVaultX()}>Deposit Vault-X</button>

        </section>
      </>
    );
  // }, [connection]);

};


