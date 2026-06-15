package backend.model.freelancer.gig;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Data
public class GigCoverImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Basic(fetch = FetchType.LAZY)
    @Column(name = "gig_cover_image_data", columnDefinition = "bytea")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private byte[] gigCoverImageData;
    private String gigCoverImageName;
    private String gigCoverImageContentType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gig_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Gig gig;
}
