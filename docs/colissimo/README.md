# Colissimo – Technical Specifications (Reference Only)

This folder contains official Colissimo Web Services specifications (YAML).
These documents are provided to support correct and safe integration of Colissimo services.

⚠️ IMPORTANT RULES (READ CAREFULLY)

- These files are provided for **REFERENCE ONLY**.
- They must **NOT** be treated as source code.
- They must **NOT** be imported, parsed, or used at runtime.
- Do **NOT** generate full integrations from these files without explicit instructions.
- When using these files, always **limit reading to the strictly necessary sections**.

Allowed usage:
- verify field names
- check required vs optional parameters
- confirm payload / response structure
- understand enum values and constraints

Forbidden usage:
- summarizing the entire YAML
- scanning unrelated sections
- inventing features or endpoints not explicitly requested

---

## FILES

### 1) colissimo-pointretrait-choix-livraison-ws.yaml
**Scope:** Choix de livraison / Point Relais  
**Type:** REST Web Service (v2)

Use this file when working on:
- Point Relais / Point Retrait search
- `findRDVPointRetraitAcheminement`
- delivery choice at checkout

Typical sections to look up:
- endpoint path
- request parameters
- response fields (`errorCode`, relay point list)

---

### 2) colissimo-sls-affranchissement-v2.0.yaml
**Scope:** Affranchissement (SLS)  
**Type:** REST Web Service

Use this file when working on:
- shipment creation
- label generation
- affranchissement via API

Typical sections to look up:
- shipment / parcel payload structure
- required sender / recipient fields
- service codes and options

---

### 3) colissimo-tunnel-commande-getDateLivraison-v3.0.1.yaml
**Scope:** Tunnel de commande  
**Type:** REST Web Service

Use this file when working on:
- delivery date estimation
- `getDateLivraison`
- display of estimated delivery dates in checkout

Typical sections to look up:
- input parameters for date estimation
- delivery date calculation rules
- response format

---

## CURSOR / AI USAGE GUIDELINES

When working on Colissimo features, always specify explicitly:
- which YAML file is relevant
- which operation or endpoint is targeted
- which fields need to be checked

⚠️ To reduce token usage and avoid errors:
- Do NOT read the entire YAML file
- Use **targeted search by keywords** (endpoint name, field name)
- Ignore all unrelated sections

Example:
> “Use `colissimo-pointretrait-choix-livraison-ws.yaml`  
> Search only for `findRDVPointRetraitAcheminement` and related response fields.”

---

This documentation is intentionally isolated from application code to keep the integration:
- predictable
- maintainable
- low-noise for automated tools