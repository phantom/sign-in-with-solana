import { SolanaSignInInput } from "@solana/wallet-standard-features";

export const createSignInData = async (): Promise<SolanaSignInInput> => {
  const now: Date = new Date();
  const uri = window.location.href
  const currentUrl = new URL(uri);
  const domain = currentUrl.host;

  // Convert the Date object to a string
  const currentDateTime = now.toISOString();
  const signInData: SolanaSignInInput = {
    domain,
    statement: "Clicking Sign or Approve only means you have proved this wallet is owned by you. This request will not trigger any blockchain transaction or cost any gas fee.",
    version: "1",
    nonce: "oBbLoEldZs",
    chainId: "mainnet",
    issuedAt: currentDateTime,
    resources: ["https://example.com", "https://phantom.app/"],
  };

  return signInData;
};

export const createSignInErrorData = async (): Promise<SolanaSignInInput> => {
  const now: Date = new Date();

  // Convert the Date object to a string
  const currentDateTime = now.toISOString();
  const signInData: SolanaSignInInput = {
    domain: "phishing.com",
    statement: "Sign-in to connect!",
    uri: "https://www.phishing.com",
    version: "1",
    nonce: "oBbLoEldZs",
    chainId: "solana:mainnet",
    issuedAt: currentDateTime,
    resources: ["https://example.com", "https://phantom.app/"]
  };

  return signInData;
};
