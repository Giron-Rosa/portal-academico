package pe.sanagustin.portal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pe.sanagustin.portal.entity.Personal;

import java.util.List;

@Repository
public interface PersonalRepository extends JpaRepository<Personal, Long> {
    List<Personal> findByActivoTrue();
}
