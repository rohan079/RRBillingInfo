package com.Billing.application.repository;

import com.Billing.application.entity.InventoryItem;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {

	List<InventoryItem> findAllByOrderByBarcodeAsc();
	Optional<InventoryItem> findByBarcode(String barcode);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT i FROM InventoryItem i WHERE i.barcode = :barcode")
	Optional<InventoryItem> findByBarcodeForUpdate(@Param("barcode") String barcode);

	boolean existsByBarcode(String barcode);

	void deleteByBarcode(String barcode);

	List<InventoryItem> findByBarcodeStartingWithOrderByBarcodeDesc(String prefix, Pageable pageable);

	List<InventoryItem> findByBarcodeStartingWithOrderByIdDesc(String prefix, Pageable pageable);
}
