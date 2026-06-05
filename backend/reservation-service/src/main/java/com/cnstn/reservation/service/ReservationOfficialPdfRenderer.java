package com.cnstn.reservation.service;

import com.cnstn.reservation.entity.ReservationEntity;
import com.cnstn.reservation.entity.ReservationOfficialDocumentType;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class ReservationOfficialPdfRenderer {

    private static final ZoneId DISPLAY_ZONE = ZoneId.of("Africa/Tunis");
    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(DISPLAY_ZONE);

    private static final Font TITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15);
    private static final Font SECTION_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
    private static final Font LABEL_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
    private static final Font VALUE_FONT = FontFactory.getFont(FontFactory.HELVETICA, 10);
    private static final Font FOOTER_FONT = FontFactory.getFont(FontFactory.HELVETICA, 9);

    public byte[] renderRequestPdf(
            ReservationEntity reservation,
            String documentReference,
            int businessVersion,
            String generatedBy,
            String purpose,
            Instant generatedAt
    ) {
        Objects.requireNonNull(reservation);
        Objects.requireNonNull(documentReference);

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 84, 58);
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);
            writer.setPageEvent(new DocumentFooter(documentReference, businessVersion));

            document.open();
            addHeader(document, "Formulaire officiel - Reservation", documentReference, businessVersion, generatedAt);
            addReservationSection(document, reservation);

            PdfPTable requestTable = twoColumnTable();
            addRow(requestTable, "Demandeur", generatedBy);
            addRow(requestTable, "Date soumission", formatDate(generatedAt));
            addRow(requestTable, "Motif", normalize(purpose, "Aucun motif"));
            addSection(document, "Soumission", requestTable);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Impossible de generer le PDF officiel reservation", ex);
        }
    }

    public byte[] renderDecisionPdf(
            ReservationEntity reservation,
            ReservationOfficialDocumentType documentType,
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
        Objects.requireNonNull(reservation);
        Objects.requireNonNull(documentType);
        Objects.requireNonNull(documentReference);

        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 84, 58);
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);
            writer.setPageEvent(new DocumentFooter(documentReference, businessVersion));

            document.open();
            addHeader(document, "Decision officielle - Reservation", documentReference, businessVersion, decisionAt);
            addReservationSection(document, reservation);

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
            throw new IllegalStateException("Impossible de generer le PDF de decision reservation", ex);
        }
    }

    private void addHeader(
            Document document,
            String title,
            String reference,
            int businessVersion,
            Instant generatedAt
    ) throws DocumentException {
        Paragraph organization = new Paragraph("CNSTN - Direction des Systemes Numeriques", LABEL_FONT);
        organization.setAlignment(Element.ALIGN_LEFT);
        organization.setSpacingAfter(8f);
        document.add(organization);

        Paragraph titleParagraph = new Paragraph(title, TITLE_FONT);
        titleParagraph.setAlignment(Element.ALIGN_LEFT);
        titleParagraph.setSpacingAfter(10f);
        document.add(titleParagraph);

        PdfPTable metadata = twoColumnTable();
        addRow(metadata, "Reference", reference);
        addRow(metadata, "Version", "v" + businessVersion);
        addRow(metadata, "Date generation", formatDate(generatedAt));
        addRow(metadata, "Format", "A4 portrait");
        document.add(metadata);
        document.add(new Paragraph(" ", VALUE_FONT));
    }

    private void addReservationSection(Document document, ReservationEntity reservation) throws DocumentException {
        PdfPTable table = twoColumnTable();
        addRow(table, "Reference reservation", normalize(reservation.getReferenceCode(), "N/A"));
        addRow(table, "Evenement lie", reservation.getEventId() == null ? "N/A" : reservation.getEventId().toString());
        addRow(table, "Mode evenement", reservation.getEventMode() == null ? "N/A" : reservation.getEventMode().name());
        addRow(table, "Type ressource", reservation.getRoom() != null ? "Salle" : "Equipement");
        addRow(table, "Ressource", resolveResourceName(reservation));
        addRow(table, "Demandeur", normalize(reservation.getRequesterUsername(), "N/A"));
        addRow(table, "Debut", formatDate(reservation.getStartAt()));
        addRow(table, "Fin", formatDate(reservation.getEndAt()));
        addRow(table, "Statut", reservation.getStatus() == null ? "N/A" : reservation.getStatus().name());
        addRow(table, "Version metier", String.valueOf(Math.max(1, reservation.getBusinessVersion())));
        addSection(document, "Donnees reservation", table);
    }

    private String resolveResourceName(ReservationEntity reservation) {
        if (reservation.getRoom() != null) {
            return normalize(reservation.getRoom().getName(), "Salle");
        }
        if (reservation.getEquipment() != null) {
            return normalize(reservation.getEquipment().getName(), "Equipement");
        }
        return "N/A";
    }

    private void addSection(Document document, String title, PdfPTable table) throws DocumentException {
        Paragraph sectionTitle = new Paragraph(title, SECTION_FONT);
        sectionTitle.setSpacingBefore(8f);
        sectionTitle.setSpacingAfter(6f);
        document.add(sectionTitle);
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
        labelCell.setPadding(5f);
        labelCell.setBorder(Rectangle.BOX);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, VALUE_FONT));
        valueCell.setPadding(5f);
        valueCell.setBorder(Rectangle.BOX);
        table.addCell(valueCell);
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
