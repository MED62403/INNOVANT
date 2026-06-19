const LOGO_URL = "https://media.base44.com/images/public/69f1234c1439b9279fd45148/b32aaa35b_Blue_and_Green_Cleaning_Services_Logo_20250803_233347_0000.png";

// Designed to fit exactly half an A4 page (105mm tall at 96dpi ≈ 397px)
export default function FactureTemplate({ facture }) {
  const formatGNF = (n) => new Intl.NumberFormat("fr-FR").format(n);

  const s = {
    wrap: {
      fontFamily: "'Inter', Arial, sans-serif",
      backgroundColor: "#fff",
      padding: "14px 20px 10px 20px",
      width: "100%",
      boxSizing: "border-box",
      color: "#1a1a2e",
    },
    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    companyName: {
      fontSize: 14,
      fontWeight: 800,
      color: "#1565C0",
      letterSpacing: 1,
      margin: 0,
    },
    companyMeta: {
      fontSize: 8,
      color: "#6b7280",
      margin: "2px 0 0 0",
      lineHeight: 1.5,
    },
    factureLabel: {
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: 3,
      color: "#9ca3af",
      textTransform: "uppercase",
      textAlign: "right",
      marginTop: 4,
    },
    divider: {
      height: 2,
      background: "linear-gradient(to right, #1565C0, #66BB6A)",
      borderRadius: 2,
      marginBottom: 8,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      marginBottom: 8,
    },
    infoBox: {
      backgroundColor: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 6,
      padding: "6px 8px",
    },
    boxLabel: {
      fontSize: 7,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1,
      color: "#94a3b8",
      marginBottom: 4,
    },
    infoTable: {
      width: "100%",
      fontSize: 8,
      borderCollapse: "collapse",
    },
    th: {
      textAlign: "left",
      color: "#1565C0",
      backgroundColor: "#1565C0",
      padding: "4px 6px",
      fontWeight: 600,
      fontSize: 8,
    },
    td: {
      padding: "4px 6px",
      fontSize: 8,
      color: "#374151",
      borderBottom: "1px solid #f1f5f9",
    },
    totalBox: {
      display: "flex",
      justifyContent: "flex-end",
      marginBottom: 8,
    },
    totalInner: {
      border: "2px solid #1565C0",
      borderRadius: 6,
      padding: "5px 12px",
      textAlign: "right",
      minWidth: 160,
    },
    totalLabel: {
      fontSize: 7,
      textTransform: "uppercase",
      letterSpacing: 1,
      color: "#94a3b8",
      fontWeight: 700,
    },
    totalAmount: {
      fontSize: 13,
      fontWeight: 800,
      color: "#1565C0",
      margin: "2px 0 0 0",
    },
    footer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginTop: 4,
    },
    footerText: {
      fontSize: 7,
      fontStyle: "italic",
      color: "#1565C0",
      flex: 1,
    },
    signature: {
      textAlign: "center",
    },
    signatureLine: {
      width: 80,
      borderBottom: "1px solid #9ca3af",
      marginBottom: 2,
    },
    signatureLabel: {
      fontSize: 7,
      fontWeight: 700,
      color: "#6b7280",
    },
  };

  return (
    <div style={s.wrap}>
      <div style={s.headerRow}>
        <div>
          <p style={s.companyName}>SANYA SERVICE</p>
          <p style={s.companyMeta}>
            Kérouané, Guinée<br />
            ☎ +224 610 580 708 / 626 837 381<br />
            ✉ sanyaservicekne@gmail.com
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <img src={LOGO_URL} alt="Logo" style={{ height: 44, width: "auto" }} />
          <p style={s.factureLabel}>FACTURE</p>
        </div>
      </div>

      <div style={s.divider} />

      <div style={s.grid}>
        <div style={s.infoBox}>
          <p style={s.boxLabel}>Informations facture</p>
          <table style={s.infoTable}>
            <tbody>
              <tr>
                <td style={{ ...s.td, fontWeight: 600, color: "#374151", width: "45%" }}>N° Facture</td>
                <td style={{ ...s.td, fontFamily: "monospace", fontWeight: 700, color: "#1565C0" }}>{facture.numero_facture}</td>
              </tr>
              <tr>
                <td style={{ ...s.td, fontWeight: 600, color: "#374151" }}>Date</td>
                <td style={s.td}>{facture.date_facturation}</td>
              </tr>
              <tr>
                <td style={{ ...s.td, fontWeight: 600, color: "#374151" }}>Période</td>
                <td style={s.td}>{facture.periode_service || facture.mois}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={s.infoBox}>
          <p style={s.boxLabel}>Facturé à</p>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#1e293b", margin: "0 0 2px 0" }}>{facture.nom_client}</p>
          <p style={{ fontSize: 8, color: "#64748b", margin: 0 }}>{facture.adresse_client}</p>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8 }}>
          <thead>
            <tr>
              <th style={{ ...s.th, textAlign: "left", borderRadius: "4px 0 0 0" }}>Description du service</th>
              <th style={{ ...s.th, textAlign: "center", width: 40 }}>Qté</th>
              <th style={{ ...s.th, textAlign: "right", width: 90 }}>Prix Unitaire</th>
              <th style={{ ...s.th, textAlign: "right", width: 90, borderRadius: "0 4px 0 0" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: "#f8fafc" }}>
              <td style={{ ...s.td }}>{facture.description_service}</td>
              <td style={{ ...s.td, textAlign: "center", fontFamily: "monospace" }}>{String(facture.quantite || 1).padStart(2, "0")}</td>
              <td style={{ ...s.td, textAlign: "right" }}>{formatGNF(facture.prix_unitaire)} GNF</td>
              <td style={{ ...s.td, textAlign: "right", fontWeight: 700 }}>{formatGNF(facture.montant_total)} GNF</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={s.totalBox}>
        <div style={s.totalInner}>
          <p style={s.totalLabel}>Montant Total à Payer</p>
          <p style={s.totalAmount}>{formatGNF(facture.montant_total)} GNF</p>
          {facture.date_limite_paiement && (
            <p style={{ fontSize: 7, color: "#6b7280", marginTop: 2 }}>Échéance : <strong>{facture.date_limite_paiement}</strong></p>
          )}
        </div>
      </div>

      <div style={{ height: 1, backgroundColor: "#e5e7eb", marginBottom: 6 }} />
      <div style={s.footer}>
        <p style={s.footerText}>Merci pour votre confiance. Ensemble, construisons un environnement propre et sain !</p>
        <div style={s.signature}>
          <div style={s.signatureLine} />
          <p style={s.signatureLabel}>SANYA SERVICE</p>
        </div>
      </div>
    </div>
  );
}