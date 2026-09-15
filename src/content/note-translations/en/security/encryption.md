---
title: "1.4 Encryption"
description: "Symmetric encryption, block modes, asymmetric encryption, RSA, and basic implementation."
translationOf: "security/encryption"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 4
tags: ["Security", "Encryption"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. What Is Encryption
Encryption transforms plaintext into ciphertext so that unauthorized parties cannot directly read the content.

## 2. Encryption Property
Confidentiality.

## 3. Three Elements of Encryption
### 3.1. Encryption
- Plaintext
- Key
- Encryption algorithm

### 3.2. Decryption
- Ciphertext
- Key
- Decryption algorithm; depending on the cryptosystem, this may differ from the encryption operation.

## 4. Categories of Encryption Algorithms
### 4.1. Symmetric Encryption
#### 4.1.1. What It Is
- Both parties share the same secret key.
- Advantage: high encryption/decryption performance.
- Limitation: the shared key must be distributed and stored securely.

#### 4.1.2. Caesar Cipher
![](https://raw.githubusercontent.com/TDoct/images/master/1593173182_20200620112216892_4915.png)

#### 4.1.3. DES
DES is no longer appropriate for modern security use.

- Key: historically represented as 8 bytes including parity bits.
- Block size: 8 bytes.

![](https://raw.githubusercontent.com/TDoct/images/master/1593173209_20200626192149913_32146.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593173210_20200626192206224_12108.png)

#### 4.1.4. 3DES
Triple DES applies DES operations multiple times and was designed partly for backward compatibility. New systems should not prefer 3DES.

- It uses multiple DES keys.
- Block size remains 8 bytes.

![](https://raw.githubusercontent.com/TDoct/images/master/1593173186_20200620113320479_10877.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593173188_20200620113348122_19436.png)

#### 4.1.5. AES
AES is the modern block cipher to prefer in this group of algorithms.

- Key sizes: 16, 24, or 32 bytes.
- Block size: 16 bytes.
- In new systems, use a suitable authenticated-encryption mode such as GCM where possible, or otherwise provide separate integrity protection.

### 4.2. Block Cipher Modes
DES, 3DES, and AES are block ciphers. A mode of operation defines how to process data longer than one block.

#### 4.2.1. Relationship Between Blocks and Symmetric Encryption
![](https://raw.githubusercontent.com/TDoct/images/master/1593173190_20200620113944098_3690.png)

#### 4.2.2. ECB
- Operates independently on blocks.
- Padding is required when plaintext length is not aligned to the block size.
- Identical plaintext blocks produce identical ciphertext blocks, so ECB leaks patterns and should not be used for ordinary confidential messages.
- Blocks can be processed in parallel.

![](https://raw.githubusercontent.com/TDoct/images/master/1593173215_20200626193650093_31659.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593173217_20200626193659840_22819.png)

#### 4.2.3. CBC
- Uses a block-sized initialization vector.
- Plaintext usually requires padding.
- Each ciphertext block influences the next encryption step.
- Encryption is sequential; decryption can be parallelized by block once ciphertext is available.

![](https://raw.githubusercontent.com/TDoct/images/master/1593173212_20200626193549188_1009.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593173214_20200626193557901_18297.png)

#### 4.2.4. CFB
- Converts a block cipher into a stream-like mode.
- Does not require padding in the same way as CBC.
- Requires an IV.
- Decryption can be parallelized in common forms; encryption depends on prior output.

![](https://raw.githubusercontent.com/TDoct/images/master/1593173218_20200626193950223_12093.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593173242_20200626194001366_2906.png)

#### 4.2.5. OFB
- Generates a keystream by repeatedly encrypting internal state derived from the IV.
- Does not require padding in the same way as block-by-block modes.

![](https://raw.githubusercontent.com/TDoct/images/master/1593173244_20200626194158023_7668.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593173246_20200626194205658_27334.png)

#### 4.2.6. CTR
- Encrypts successive counter values to produce a keystream.
- Does not require padding.
- Encryption and decryption can be parallelized.
- The nonce/counter input must never repeat under the same key.

![](https://raw.githubusercontent.com/TDoct/images/master/1593173192_20200620131420479_15159.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593173194_20200620131433329_3006.png)

### 4.3. Asymmetric Encryption
#### 4.3.1. What It Is
- A key pair contains a public key and a private key. The public key can be shared; the private key must remain secret.
  - Signing and verification: sign with the private key and verify with the public key.
  - Encryption and decryption: for RSA encryption, encrypt with the recipient's public key and decrypt with its private key.
- Limitation: public-key operations are much slower than symmetric cryptography.
- Advantage: the private key does not have to be transmitted to parties that use the public key.

![](https://raw.githubusercontent.com/TDoct/images/master/1593173196_20200625103233745_12095.png)

#### 4.3.2. RSA Algorithm
![](https://raw.githubusercontent.com/TDoct/images/master/1593173198_20200625104316638_28549.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1593173200_20200625104332702_30648.png)

#### 4.3.3. Mathematical Idea
- Choose two large primes `p` and `q`.
- Compute `N = p * q`.
- Compute Euler's totient `φ(N) = (p-1)(q-1)` for distinct primes.
- Choose a public exponent `e` that is coprime with `φ(N)`.
- Compute the private exponent `d` such that `e*d ≡ 1 (mod φ(N))`.
- The public key contains `(N, e)` and the private key includes `d` together with the required private parameters.

#### 4.3.4. Working Process
For textbook RSA, encryption and decryption are modular exponentiation operations. Real applications must use standardized padding/encoding schemes such as OAEP for encryption and PSS for signatures rather than raw textbook RSA.

##### 4.3.4.1. Euler's Totient
The correctness of RSA follows from modular arithmetic and Euler/Fermat-style number-theoretic results under the required conditions.

## 5. Implementation
### 5.1. OpenSSL
```bash
# Generate a private key
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out rsa_private_key.pem

# Export the public key
openssl pkey -in rsa_private_key.pem -pubout -out rsa_public_key.pem
```

### 5.2. Golang Implementation
#### 5.2.1. AES-CTR
```go
package main

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "fmt"
    "io"
)

func cryptCTR(key, iv, input []byte) ([]byte, error) {
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }
    output := make([]byte, len(input))
    cipher.NewCTR(block, iv).XORKeyStream(output, input)
    return output, nil
}

func main() {
    key := make([]byte, 32)
    if _, err := io.ReadFull(rand.Reader, key); err != nil { panic(err) }
    iv := make([]byte, aes.BlockSize)
    if _, err := io.ReadFull(rand.Reader, iv); err != nil { panic(err) }

    plaintext := []byte("hello")
    ciphertext, _ := cryptCTR(key, iv, plaintext)
    recovered, _ := cryptCTR(key, iv, ciphertext)
    fmt.Println(string(recovered))
}
```

## 6. References
- [RSA Algorithm, Part I](https://www.ruanyifeng.com/blog/2013/06/rsa_algorithm_part_one.html)
- [RSA Algorithm, Part II](http://www.ruanyifeng.com/blog/2013/07/rsa_algorithm_part_two.html)
