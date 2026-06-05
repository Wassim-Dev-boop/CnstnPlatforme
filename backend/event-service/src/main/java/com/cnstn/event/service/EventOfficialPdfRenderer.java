package com.cnstn.event.service;

import com.cnstn.event.entity.EventEntity;
import com.cnstn.event.entity.EventOfficialDocumentType;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPCellEvent;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.awt.Color;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class EventOfficialPdfRenderer {

    private static final String CNSTN_LOGO_RESOURCE = "/images/logo/logo1.png";
    private static final ZoneId DISPLAY_ZONE = ZoneId.of("Africa/Tunis");
    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(DISPLAY_ZONE);

    private static final Color NAVY = new Color(20, 38, 71);
    private static final Color BLUE = new Color(40, 84, 168);
    private static final Color LIGHT_BLUE = new Color(236, 243, 255);
    private static final Color BORDER = new Color(207, 216, 231);
    private static final Color SOFT_GRAY = new Color(248, 250, 252);
    private static final Color TUNISIA_RED = new Color(231, 0, 19);
    private static final Color WHITE = Color.WHITE;

    private static final Font TITLE_FONT = coloredFont(FontFactory.HELVETICA_BOLD, 16, NAVY);
    private static final Font HEADER_FONT = coloredFont(FontFactory.HELVETICA_BOLD, 10, NAVY);
    private static final Font HEADER_MUTED_FONT = coloredFont(FontFactory.HELVETICA, 8, new Color(83, 99, 124));
    private static final Font SECTION_FONT = coloredFont(FontFactory.HELVETICA_BOLD, 12, NAVY);
    private static final Font LABEL_FONT = coloredFont(FontFactory.HELVETICA_BOLD, 9, new Color(61, 75, 99));
    private static final Font VALUE_FONT = coloredFont(FontFactory.HELVETICA, 10, new Color(30, 41, 59));
    private static final Font FOOTER_FONT = coloredFont(FontFactory.HELVETICA, 8, new Color(100, 116, 139));
    private static final Font WHITE_BOLD_FONT = coloredFont(FontFactory.HELVETICA_BOLD, 10, WHITE);

    public byte[] renderSubmissionPdf(
            EventEntity event,
            String documentReference,
            int businessVersion,
            String generatedBy,
            String submissionComment,
            Instant generatedAt
    ) {
        Objects.requireNonNull(event);
        Objects.requireNonNull(documentReference);

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 40, 58);
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);
            writer.setPageEvent(new DocumentFooter(documentReference, businessVersion));

            document.open();
            addHeader(document, "Formulaire officiel - Evenement", documentReference, businessVersion, generatedAt);
            addEventSection(document, event);

            PdfPTable submissionTable = twoColumnTable();
            addRow(submissionTable, "Soumis par", generatedBy);
            addRow(submissionTable, "Date soumission", formatDate(generatedAt));
            addRow(submissionTable, "Commentaire", normalize(submissionComment, "Aucun commentaire"));
            addSection(document, "Soumission", submissionTable);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Impossible de generer le PDF officiel evenement", ex);
        }
    }

    public byte[] renderDecisionPdf(
            EventEntity event,
            EventOfficialDocumentType documentType,
            String documentReference,
            int businessVersion,
            String generatedBy,
            String decisionRole,
            String decisionName,
            String decisionValue,
            String decisionComment,
            String rejectionReason,
            Instant decisionAt
    ) {
        Objects.requireNonNull(event);
        Objects.requireNonNull(documentType);
        Objects.requireNonNull(documentReference);

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 40, 58);
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);
            writer.setPageEvent(new DocumentFooter(documentReference, businessVersion));

            document.open();
            addHeader(document, resolveDecisionTitle(documentType), documentReference, businessVersion, decisionAt);
            addEventSection(document, event);

            PdfPTable decisionTable = twoColumnTable();
            addRow(decisionTable, "Decision", normalize(decisionValue, "N/A"));
            addRow(decisionTable, "Role valideur", normalize(decisionRole, "N/A"));
            addRow(decisionTable, "Nom valideur", normalize(decisionName, generatedBy));
            addRow(decisionTable, "Date decision", formatDate(decisionAt));
            addRow(decisionTable, "Commentaire", normalize(decisionComment, "Aucun commentaire"));
            addRow(decisionTable, "Motif refus", normalize(rejectionReason, "Aucun"));
            addSection(document, "Bloc validation / refus", decisionTable);

            PdfPTable signatureTable = twoColumnTable();
            addRow(signatureTable, "Signature niveau 1", "Validation numerique tracee");
            addRow(signatureTable, "Signataire", normalize(decisionName, generatedBy));
            addRow(signatureTable, "Role", normalize(decisionRole, "N/A"));
            addRow(signatureTable, "Horodatage", formatDate(decisionAt));
            addSection(document, "Signature", signatureTable);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Impossible de generer le PDF de decision evenement", ex);
        }
    }

    private void addHeader(
            Document document,
            String title,
            String reference,
            int businessVersion,
            Instant generatedAt
    ) throws DocumentException {
        PdfPTable masthead = new PdfPTable(new float[]{1.2f, 4.8f, 1.2f});
        masthead.setWidthPercentage(100f);
        masthead.setSpacingAfter(14f);

        masthead.addCell(createLogoCell());

        PdfPCell organization = new PdfPCell();
        organization.setBorder(Rectangle.NO_BORDER);
        organization.setPadding(0f);
        organization.setPaddingLeft(14f);
        organization.setVerticalAlignment(Element.ALIGN_MIDDLE);
        Paragraph republic = new Paragraph("Republique Tunisienne", HEADER_FONT);
        Paragraph ministry = new Paragraph("Centre National des Sciences et Technologies Nucleaires", HEADER_FONT);
        Paragraph direction = new Paragraph("Direction des Systemes Numeriques - Document officiel evenement", HEADER_MUTED_FONT);
        organization.addElement(republic);
        organization.addElement(ministry);
        organization.addElement(direction);
        masthead.addCell(organization);

        PdfPCell flag = new PdfPCell(new Phrase("TUNISIE", WHITE_BOLD_FONT));
        flag.setFixedHeight(58f);
        flag.setBorder(Rectangle.NO_BORDER);
        flag.setCellEvent(new TunisiaFlagCellEvent());
        flag.setHorizontalAlignment(Element.ALIGN_CENTER);
        flag.setVerticalAlignment(Element.ALIGN_BOTTOM);
        flag.setPaddingBottom(6f);
        masthead.addCell(flag);
        document.add(masthead);

        Paragraph titleParagraph = new Paragraph(title, TITLE_FONT);
        titleParagraph.setAlignment(Element.ALIGN_CENTER);
        titleParagraph.setSpacingAfter(12f);
        document.add(titleParagraph);

        PdfPTable metadata = twoColumnTable();
        addRow(metadata, "Reference", reference);
        addRow(metadata, "Version", "v" + businessVersion);
        addRow(metadata, "Date generation", formatDate(generatedAt));
        addRow(metadata, "Classification", "Document interne officiel");
        document.add(metadata);
        document.add(new Paragraph(" ", VALUE_FONT));
    }

    private PdfPCell createLogoCell() throws DocumentException {
        PdfPCell logoCell = new PdfPCell();
        logoCell.setFixedHeight(58f);
        logoCell.setBorder(Rectangle.NO_BORDER);
        logoCell.setBackgroundColor(WHITE);
        logoCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        logoCell.setPadding(4f);

        Image logoImage = loadLogoImage();
        if (logoImage != null) {
            logoImage.scaleToFit(112f, 48f);
            logoImage.setAlignment(Element.ALIGN_CENTER);
            logoCell.addElement(logoImage);
            return logoCell;
        }

        PdfPCell fallback = new PdfPCell(new Phrase("CNSTN", WHITE_BOLD_FONT));
        fallback.setFixedHeight(58f);
        fallback.setBorder(Rectangle.NO_BORDER);
        fallback.setBackgroundColor(BLUE);
        fallback.setHorizontalAlignment(Element.ALIGN_CENTER);
        fallback.setVerticalAlignment(Element.ALIGN_MIDDLE);
        fallback.setPadding(8f);
        return fallback;
    }

    private Image loadLogoImage() {
        try (InputStream stream = getClass().getResourceAsStream(CNSTN_LOGO_RESOURCE)) {
            if (stream == null) {
                return null;
            }
            return Image.getInstance(stream.readAllBytes());
        } catch (Exception ex) {
            return null;
        }
    }

    private void addEventSection(Document document, EventEntity event) throws DocumentException {
        PdfPTable eventTable = twoColumnTable();
        addRow(eventTable, "Reference evenement", normalize(event.getReferenceCode(), "N/A"));
        addRow(eventTable, "Titre", normalize(event.getTitle(), "N/A"));
        addRow(eventTable, "Type", event.getEventType() == null ? "N/A" : event.getEventType().name());
        addRow(eventTable, "Mode", event.getEventMode() == null ? "N/A" : event.getEventMode().name());
        addRow(eventTable, "Statut", event.getStatus() == null ? "N/A" : event.getStatus().name());
        addRow(eventTable, "Workflow", event.getWorkflowStep() == null ? "N/A" : event.getWorkflowStep().name());
        addRow(eventTable, "Demandeur", normalize(event.getRequestedBy(), "N/A"));
        addRow(eventTable, "Debut", formatDate(event.getStartAt()));
        addRow(eventTable, "Fin", formatDate(event.getEndAt()));
        addRow(eventTable, "Lieu", normalize(event.getLocation(), "N/A"));
        addRow(eventTable, "Version metier", String.valueOf(event.getBusinessVersion()));
        addSection(document, "Donnees evenement", eventTable);

        if (event.getEventMode() != null && event.getEventMode().name().contains("LIGNE")) {
            PdfPTable onlineTable = twoColumnTable();
            addRow(onlineTable, "Provider", normalize(event.getOnlineMeetingProvider(), "N/A"));
            addRow(onlineTable, "Lien reunion", normalize(event.getOnlineMeetingLink(), "N/A"));
            addRow(onlineTable, "Meeting ID", normalize(event.getOnlineMeetingId(), "N/A"));
            addSection(document, "Reunion en ligne", onlineTable);
        }
    }

    private void addSection(Document document, String title, PdfPTable table) throws DocumentException {
        PdfPTable sectionHeader = new PdfPTable(new float[]{0.12f, 5f});
        sectionHeader.setWidthPercentage(100f);
        sectionHeader.setSpacingBefore(8f);
        sectionHeader.setSpacingAfter(6f);

        PdfPCell accent = new PdfPCell(new Phrase(""));
        accent.setBorder(Rectangle.NO_BORDER);
        accent.setBackgroundColor(BLUE);
        accent.setFixedHeight(18f);
        sectionHeader.addCell(accent);

        PdfPCell titleCell = new PdfPCell(new Phrase("  " + title, SECTION_FONT));
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleCell.setBackgroundColor(LIGHT_BLUE);
        titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        titleCell.setPadding(4f);
        sectionHeader.addCell(titleCell);
        document.add(sectionHeader);
        document.add(table);
        document.add(new Paragraph(" ", VALUE_FONT));
    }

    private PdfPTable twoColumnTable() {
        PdfPTable table = new PdfPTable(new float[]{2f, 5f});
        table.setWidthPercentage(100f);
        table.getDefaultCell().setBorder(Rectangle.BOX);
        table.getDefaultCell().setPadding(5f);
        return table;
    }

    private void addRow(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, LABEL_FONT));
        labelCell.setPadding(7f);
        labelCell.setBorderColor(BORDER);
        labelCell.setBackgroundColor(SOFT_GRAY);
        labelCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, VALUE_FONT));
        valueCell.setPadding(7f);
        valueCell.setBorderColor(BORDER);
        valueCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(valueCell);
    }

    private String resolveDecisionTitle(EventOfficialDocumentType type) {
        return switch (type) {
            case DECISION_MANAGER -> "Decision officielle - Validation manager";
            case DECISION_SECURITE -> "Decision officielle - Validation securite";
            case DECISION_DSN -> "Decision officielle - Validation DSN";
            case DECISION_SALLE -> "Decision officielle - Validation salle";
            default -> "Decision officielle - Evenement";
        };
    }

    private String formatDate(Instant instant) {
        if (instant == null) {
            return "N/A";
        }
        return DATE_TIME_FORMATTER.format(instant);
    }

    private String normalize(String value, String fallback) {
        if (value == null || value.trim().isEmpty()) {
            return fallback;
        }
        return value.trim();
    }

    private static Font coloredFont(String family, int size, Color color) {
        Font font = FontFactory.getFont(family, size);
        font.setColor(color);
        return font;
    }

    private static final class TunisiaFlagCellEvent implements PdfPCellEvent {

        @Override
        public void cellLayout(PdfPCell cell, Rectangle position, PdfContentByte[] canvases) {
            PdfContentByte canvas = canvases[PdfPTable.BACKGROUNDCANVAS];
            canvas.saveState();
            canvas.setColorFill(TUNISIA_RED);
            canvas.rectangle(position.getLeft(), position.getBottom(), position.getWidth(), position.getHeight());
            canvas.fill();

            float centerX = (position.getLeft() + position.getRight()) / 2f;
            float centerY = (position.getBottom() + position.getTop()) / 2f + 3f;
            float radius = Math.min(position.getWidth(), position.getHeight()) * 0.28f;

            canvas.setColorFill(WHITE);
            canvas.circle(centerX, centerY, radius);
            canvas.fill();

            canvas.setColorFill(TUNISIA_RED);
            canvas.circle(centerX + radius * 0.16f, centerY, radius * 0.58f);
            canvas.fill();
            canvas.setColorFill(WHITE);
            canvas.circle(centerX + radius * 0.34f, centerY, radius * 0.46f);
            canvas.fill();

            drawStar(canvas, centerX + radius * 0.28f, centerY, radius * 0.34f);
            canvas.restoreState();
        }

        private static void drawStar(PdfContentByte canvas, float cx, float cy, float radius) {
            canvas.setColorFill(TUNISIA_RED);
            double start = -Math.PI / 2d;
            for (int point = 0; point < 10; point++) {
                double angle = start + point * Math.PI / 5d;
                float activeRadius = point % 2 == 0 ? radius : radius * 0.42f;
                float x = cx + (float) Math.cos(angle) * activeRadius;
                float y = cy + (float) Math.sin(angle) * activeRadius;
                if (point == 0) {
                    canvas.moveTo(x, y);
                } else {
                    canvas.lineTo(x, y);
                }
            }
            canvas.closePathFillStroke();
        }
    }

    private static final class DocumentFooter extends PdfPageEventHelper {

        private final String reference;
        private final int version;

        private DocumentFooter(String reference, int version) {
            this.reference = reference;
            this.version = version;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfPTable footerTable = new PdfPTable(2);
            try {
                footerTable.setTotalWidth(document.getPageSize().getWidth() - 72);
                footerTable.setWidths(new float[]{5f, 2f});

                PdfPCell left = new PdfPCell(new Phrase(
                        "Reference " + reference + " - Version v" + version,
                        FOOTER_FONT
                ));
                left.setBorder(Rectangle.NO_BORDER);
                left.setHorizontalAlignment(Element.ALIGN_LEFT);
                footerTable.addCell(left);

                PdfPCell right = new PdfPCell(new Phrase(
                        "Page " + writer.getPageNumber(),
                        FOOTER_FONT
                ));
                right.setBorder(Rectangle.NO_BORDER);
                right.setHorizontalAlignment(Element.ALIGN_RIGHT);
                footerTable.addCell(right);

                footerTable.writeSelectedRows(0, -1, 36, 34, writer.getDirectContent());
            } catch (DocumentException ex) {
                throw new IllegalStateException("Impossible d ecrire le pied de page PDF", ex);
            }
        }
    }
}
