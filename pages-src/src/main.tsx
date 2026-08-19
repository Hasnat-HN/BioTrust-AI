import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BioTrustApp from "../../app/BioTrustApp";
import "../../app/globals.css";

const root = document.getElementById("root");

if (!root) throw new Error("BioTrust AI root element is missing");

createRoot(root).render(
  <StrictMode>
    <BioTrustApp />
  </StrictMode>,
);
