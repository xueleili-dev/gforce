import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const NAVY = "#0f172a";
const SLATE = "#475569";
const GOLD = "#f59e0b";

const styles = StyleSheet.create({
  // ── Main checklist page ──
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: "bold", textAlign: "center", marginBottom: 4, color: NAVY },
  subtitle: { fontSize: 10, textAlign: "center", color: "#555", marginBottom: 16 },
  headerGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16, gap: 8 },
  headerItem: { width: "48%", marginBottom: 6 },
  headerLabel: { fontSize: 8, color: "#888", marginBottom: 2, textTransform: "uppercase" },
  headerValue: { fontSize: 11, fontWeight: "bold" },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginTop: 12, marginBottom: 6, backgroundColor: "#f0f0f0", padding: 6 },
  itemRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 4 },
  itemCode: { width: 50, fontWeight: "bold" },
  itemTitle: { flex: 1 },
  itemGrade: { width: 60, textAlign: "center" },
  gradeA: { color: "#16a34a", fontWeight: "bold" },
  gradeB: { color: "#d97706", fontWeight: "bold" },
  gradeC: { color: "#dc2626", fontWeight: "bold" },
  comment: { fontSize: 8, color: "#666", marginTop: 2, marginBottom: 4, marginLeft: 50 },
  summaryTitle: { fontSize: 12, fontWeight: "bold", marginTop: 28, marginBottom: 6, color: "#dc2626" },
  summaryItem: { marginBottom: 6, padding: 6, backgroundColor: "#fef2f2", borderRadius: 3 },
  summaryCode: { fontWeight: "bold", color: "#dc2626" },
  imageSection: { marginTop: 16 },
  imageTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 6 },
  imagePair: { paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginBottom: 14 },
  imagePairLast: { marginBottom: 0 },
  imageDescRow: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#f8fafc", borderRadius: 4, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 10 },
  imageDescBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: NAVY, alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 1 },
  imageDescBadgeText: { color: "#ffffff", fontSize: 9, fontWeight: "bold" },
  imageDescText: { flex: 1, fontSize: 9, color: "#334155", fontStyle: "italic", lineHeight: 1.35 },
  imageRow: { flexDirection: "row", gap: 8 },
  imageBox: { flex: 1, alignItems: "center" },
  imageLabel: { fontSize: 8, color: "#64748b", marginBottom: 4, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: "bold" },

  // ── Cover page (framed) ──
  coverPage: { backgroundColor: "#ffffff", padding: 16 },
  coverFrame: { flex: 1, borderWidth: 3, borderColor: NAVY, padding: 5 },
  coverFrameInner: { flex: 1, borderWidth: 1, borderColor: GOLD, paddingHorizontal: 34, paddingVertical: 26, alignItems: "center" },
  coverLogo: { width: 120, height: 90, objectFit: "contain", marginBottom: 16 },
  coverCompany: { fontSize: 11, fontWeight: "bold", letterSpacing: 3, color: NAVY, textAlign: "center", marginBottom: 26 },
  coverTitle: { fontSize: 22, fontWeight: "bold", color: NAVY, textAlign: "center", lineHeight: 1.15, marginBottom: 8 },
  coverSubtitle: { fontSize: 10, letterSpacing: 2, color: "#64748b", textAlign: "center", marginBottom: 18 },
  coverDivider: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  coverDividerLine: { width: 60, height: 2, backgroundColor: GOLD },
  coverDividerDiamond: { width: 7, height: 7, backgroundColor: GOLD, marginHorizontal: 8 },
  coverInfo: { width: "72%", borderWidth: 1, borderColor: "#eef2f7", borderRadius: 6, marginTop: 14 },
  coverInfoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#eef2f7", backgroundColor: "#fafbfd" },
  coverInfoRowLast: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, paddingHorizontal: 12, backgroundColor: "#fafbfd" },
  coverLabel: { fontSize: 7.5, color: "#94a3b8", letterSpacing: 1.1, textTransform: "uppercase" },
  coverValue: { fontSize: 10, fontWeight: "bold", color: NAVY },
  coverSpacer: { flex: 1 },
  coverFooter: { fontSize: 8, letterSpacing: 2, color: "#b6c0cd" },

  // ── Scope of work page ──
  scopePage: { padding: 40, backgroundColor: "#ffffff" },
  scopeTitle: { fontSize: 16, fontWeight: "bold", textAlign: "center", color: NAVY, marginBottom: 6 },
  scopeAccent: { width: 48, height: 3, backgroundColor: GOLD, alignSelf: "center", marginBottom: 18, borderRadius: 2 },
  scopeSectionTitle: { fontSize: 12, fontWeight: "bold", color: NAVY, backgroundColor: "#f1f5f9", paddingVertical: 6, paddingHorizontal: 10, marginTop: 14, marginBottom: 8, borderRadius: 4 },
  scopeNote: { fontSize: 9, color: SLATE, lineHeight: 1.4, marginBottom: 6, fontStyle: "italic" },
  scopeItemRow: { flexDirection: "row", marginBottom: 4 },
  scopeNum: { width: 22, fontSize: 9, fontWeight: "bold", color: GOLD },
  scopeItemText: { flex: 1, fontSize: 9, color: "#334155", lineHeight: 1.3 },
  scopeContent: { flex: 1 },
  gradeLegend: { borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 12, marginTop: 16 },
  gradeLegendTitle: { fontSize: 9, fontWeight: "bold", color: NAVY, letterSpacing: 1, marginBottom: 8 },
  gradeLegendRow: { flexDirection: "row", marginBottom: 5 },
  gradeLegendLetter: { width: 18, fontSize: 9, fontWeight: "bold" },
  gradeLegendText: { flex: 1, fontSize: 9, color: "#334155", lineHeight: 1.3 },
});

const GRADE_LABELS: Record<string, string> = {
  A: "A",
  B: "B",
  C: "C",
};

// ── Static scope-of-work content (fixed standard text for all reports) ──
const SCOPE_INTRO =
  "We will engage a third-party engineering company as a partnership for the first phase of tower inspection. The work is as follows:";

const SCOPE_INSPECTION = [
  "Examine the lattice structure for signs of rust, corrosion, or physical damage.",
  "Check for any bent or deformed members, loose connections, or missing bolts.",
  "Check anchor points for proper tension and condition.",
  "Test tower body verticality with theodolite — verticality within H/1500, camber within H/750.",
  "Check hold-down bolts and nuts thread situation.",
  "Check concrete foundation for any damage.",
  "Inspect RF and MW antennas and mounts for damage or looseness.",
  "Check cable mounting situation, including feeder / fiber / power cable.",
  "Check cable connector and joint point.",
  "Inspect lightning protector connection and situation.",
  "Inspect AWL working situation and lamp aging.",
  "Verify tower earthing cable and reading within 10Ω.",
  "Record tower load and plan for extra equipment.",
  "Check for any welding points that need anti-rust paint.",
  "Pest control — clear and remove bird nests.",
];

const SCOPE_MAINTENANCE = [
  "Check general condition of the tower and report any abnormalities.",
  "Torque all tower bolts and nuts.",
  "Repaint the mast if necessary.",
  "Torque all pole-mount bolts and nuts (RF and TX).",
  "Check and report all the antenna azimuths.",
  "Torque all fence bolts and nuts.",
  "Re-clamp all feeders and fiber cable running on the tower and cable trays.",
  "Confirm that all cables are neatly packed in cable tray.",
  "Confirm earthing and report any abnormalities.",
  "Test and confirm the installation and functionality of the equipment.",
  "Test aircraft warning light and report any abnormalities.",
  "Confirm that all cables are neatly packed in cable tray.",
  "Clean the weeds — no weed-killer application.",
  "Test results, tower risk assessment, before and after pictures.",
  "NB: A professional report template for previous work must be submitted; failure to do so will result in proposal dismissal.",
];

function numberedList(items: string[], start: number) {
  return items.map((item, i) => (
    <View key={i} style={styles.scopeItemRow} wrap={false}>
      <Text style={styles.scopeNum}>{start + i}.</Text>
      <Text style={styles.scopeItemText}>{item}</Text>
    </View>
  ));
}

export function InspectionPDF({ report, checklist, images, logo }: {
  report: any;
  checklist: { section: string; code: string; title: string; grade: string; comment: string }[];
  images: { beforeImage: string; afterImage: string; description: string }[];
  logo?: string;
}) {
  const nonAItems = checklist.filter((c) => c.grade !== "A");

  const coverFields = [
    { label: "Site Name", value: report.siteName },
    { label: "Region", value: report.region },
    { label: "Type of Tower", value: report.typeOfStructure },
    { label: "Height of Tower", value: report.heightOfTower ? `${report.heightOfTower} m` : "" },
    { label: "Date", value: report.inspectionDate ? new Date(report.inspectionDate).toLocaleDateString() : "" },
    { label: "Name of Staff", value: report.staffName },
  ];

  return (
    <Document>
      {/* ── Page 1: Cover ── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverFrame}>
          <View style={styles.coverFrameInner}>
            {logo ? <Image src={logo} style={styles.coverLogo} /> : null}
            <Text style={styles.coverCompany}>GOLDEN FORCE PTY LTD</Text>
            <Text style={styles.coverTitle}>TOWER INSPECTION REPORT</Text>
            <Text style={styles.coverSubtitle}>SITE INSPECTION CHECKLIST</Text>
            <View style={styles.coverDivider}>
              <View style={styles.coverDividerLine} />
              <View style={styles.coverDividerDiamond} />
              <View style={styles.coverDividerLine} />
            </View>
            <View style={styles.coverInfo}>
              {coverFields.map((f, i) => (
                <View key={f.label} style={i === coverFields.length - 1 ? styles.coverInfoRowLast : styles.coverInfoRow}>
                  <Text style={styles.coverLabel}>{f.label}</Text>
                  <Text style={styles.coverValue}>{f.value}</Text>
                </View>
              ))}
            </View>
            <View style={styles.coverSpacer} />
            <Text style={styles.coverFooter}>GOLDEN FORCE PTY LTD</Text>
          </View>
        </View>
      </Page>

      {/* ── Page 2: Scope of Work ── */}
      <Page size="A4" style={styles.scopePage}>
        <View style={styles.scopeContent}>
          <Text style={styles.scopeTitle}>SCOPE OF WORK FOR TOWER MAINTENANCE</Text>
          <View style={styles.scopeAccent} />

          <Text style={styles.scopeSectionTitle}>1. INSPECTION</Text>
          <Text style={styles.scopeNote}>{SCOPE_INTRO}</Text>
          {numberedList(SCOPE_INSPECTION, 1)}

          <Text style={styles.scopeSectionTitle}>2. MAINTENANCE</Text>
          {numberedList(SCOPE_MAINTENANCE, 1)}
        </View>

        <View style={styles.gradeLegend}>
          <Text style={styles.gradeLegendTitle}>GRADE DEFINITIONS</Text>
          <View style={styles.gradeLegendRow}>
            <Text style={[styles.gradeLegendLetter, { color: "#16a34a" }]}>A</Text>
            <Text style={styles.gradeLegendText}>No repairs required</Text>
          </View>
          <View style={styles.gradeLegendRow}>
            <Text style={[styles.gradeLegendLetter, { color: "#d97706" }]}>B</Text>
            <Text style={styles.gradeLegendText}>General repairs required, to be repaired within 12 months</Text>
          </View>
          <View style={styles.gradeLegendRow}>
            <Text style={[styles.gradeLegendLetter, { color: "#dc2626" }]}>C</Text>
            <Text style={styles.gradeLegendText}>Critical repairs required. To be repaired within stated period</Text>
          </View>
        </View>
      </Page>

      {/* ── Page 3+: Checklist ── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>TOWER INSPECTION REPORT</Text>
        <Text style={styles.subtitle}>Site Inspection Checklist</Text>

        {/* Header info */}
        <View style={styles.headerGrid}>
          <View style={styles.headerItem}>
            <Text style={styles.headerLabel}>Site Name</Text>
            <Text style={styles.headerValue}>{report.siteName}</Text>
          </View>
          <View style={styles.headerItem}>
            <Text style={styles.headerLabel}>Region</Text>
            <Text style={styles.headerValue}>{report.region}</Text>
          </View>
          <View style={styles.headerItem}>
            <Text style={styles.headerLabel}>Type of Tower</Text>
            <Text style={styles.headerValue}>{report.typeOfStructure}</Text>
          </View>
          <View style={styles.headerItem}>
            <Text style={styles.headerLabel}>Height of Tower</Text>
            <Text style={styles.headerValue}>{report.heightOfTower ? `${report.heightOfTower} m` : ""}</Text>
          </View>
          <View style={styles.headerItem}>
            <Text style={styles.headerLabel}>Date</Text>
            <Text style={styles.headerValue}>{new Date(report.inspectionDate).toLocaleDateString()}</Text>
          </View>
          <View style={styles.headerItem}>
            <Text style={styles.headerLabel}>Name of Staff</Text>
            <Text style={styles.headerValue}>{report.staffName}</Text>
          </View>
        </View>

        {/* Checklist */}
        {groupBySection(checklist).map((section) => (
          <View key={section.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            {section.items.map((item) => (
              <View key={item.code} wrap={false}>
                <View style={styles.itemRow}>
                  <Text style={styles.itemCode}>{item.code}</Text>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={[styles.itemGrade, item.grade === "A" ? styles.gradeA : item.grade === "B" ? styles.gradeB : styles.gradeC]}>
                    Grade {GRADE_LABELS[item.grade] || item.grade}
                  </Text>
                </View>
                {item.comment ? <Text style={styles.comment}>Note: {item.comment}</Text> : null}
              </View>
            ))}
          </View>
        ))}

        {/* Summary of non-A items */}
        {nonAItems.length > 0 && (
          <View>
            <Text style={styles.summaryTitle}>Repairs Required Summary ({nonAItems.length} items)</Text>
            {nonAItems.map((item) => (
              <View key={item.code} style={styles.summaryItem} wrap={false}>
                <Text style={styles.summaryCode}>{item.code} - {item.title} [Grade {item.grade}]</Text>
                {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* Images */}
        {images.length > 0 && (
          <View style={styles.imageSection}>
            <Text style={styles.imageTitle}>Rectification Photos ({images.length})</Text>
            {images.map((img, i) => (
              <View key={i} style={i === images.length - 1 ? styles.imagePairLast : styles.imagePair} wrap={false}>
                {img.description ? (
                  <View style={styles.imageDescRow}>
                    <View style={styles.imageDescBadge}><Text style={styles.imageDescBadgeText}>{i + 1}</Text></View>
                    <Text style={styles.imageDescText}>{img.description}</Text>
                  </View>
                ) : null}
                <View style={styles.imageRow}>
                  <View style={styles.imageBox}>
                    <Text style={styles.imageLabel}>Before</Text>
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    {/* @ts-ignore */}
                    {img.beforeImage ? <Image src={img.beforeImage} style={{ width: 240, height: 180, objectFit: "contain" }} /> : <Text>No image</Text>}
                  </View>
                  <View style={styles.imageBox}>
                    <Text style={styles.imageLabel}>After</Text>
                    {/* @ts-ignore */}
                    {img.afterImage ? <Image src={img.afterImage} style={{ width: 240, height: 180, objectFit: "contain" }} /> : <Text>No image</Text>}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

function groupBySection(checklist: { section: string; code: string; title: string; grade: string; comment: string }[]) {
  const map = new Map<string, typeof checklist>();
  for (const item of checklist) {
    if (!map.has(item.section)) map.set(item.section, []);
    map.get(item.section)!.push(item);
  }
  return Array.from(map.entries()).map(([section, items]) => ({ section, items }));
}
