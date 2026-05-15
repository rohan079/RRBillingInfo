package com.Billing.application.repository;

import com.Billing.application.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, String> {

	@Query("SELECT DISTINCT i FROM Invoice i LEFT JOIN FETCH i.lines ORDER BY i.createdAt DESC")
	List<Invoice> findAllWithLinesOrderedByCreatedAtDesc();

	@Query("SELECT DISTINCT i FROM Invoice i LEFT JOIN FETCH i.lines WHERE i.id = :id")
	Optional<Invoice> findByIdWithLines(@Param("id") String id);

	@Query("SELECT COALESCE(SUM(i.total), 0) FROM Invoice i WHERE i.createdAt >= :start AND i.createdAt < :end")
	BigDecimal sumTotalBetween(@Param("start") Instant start, @Param("end") Instant end);
}
