
# O'Link

**Commit Description:**  
Implemented offline QR-based transactions with Web3 integration, enabling seamless payments. Added offline transaction storage and sync mechanism, ensuring secure UPI payments with blockchain-backed records.

**Working Demo**:  https://youtu.be/cilXdCGEF_w?si=1HEy1Z6lNCLQu1MZ

# Working
This project addresses failed transactions due to network coverage issues by enabling offline transactions through QR codes. Users can preload funds into a digital wallet, allowing transactions to be recorded even without an internet connection. Once the network is restored, the system syncs transactions to the server. Web3 integration ensures secure UPI payments, and all transactions are stored on a public blockchain for transparency and data integrity.

**Key Features:** 


**_Offline Transactions_** – Enables payments without internet access using QR codes. 

**_Preloaded Wallet_** – Users add funds online and transact offline.


**_Sync Mechanism_** – Transactions update automatically when connectivity is restored. 

**_Web3 Integration_** – Ensures secure and decentralized transaction records.

**_Blockchain Storage_** – Provides transparency and prevents data tampering.



## Installation

Install my-project with npm

```bash
  git clone "https://github.com/vicram15/O-LINK-QR"
```
Install dependencies
```bash
yarn install
```
run the local server
```bash
yarn dev
```
if any issue persist
```bash
npx vite build
```




