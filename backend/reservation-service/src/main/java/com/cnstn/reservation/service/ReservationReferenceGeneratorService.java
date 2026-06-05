package com.cnstn.reservation.service;

import com.cnstn.reservation.entity.ReservationReferenceCounterEntity;
import com.cnstn.reservation.repository.ReservationRepository;
import com.cnstn.reservation.repository.ReservationReferenceCounterRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationReferenceGeneratorService {

    private static final String RESERVATION_PREFIX = "RES";

    private final ReservationReferenceCounterRepository counterRepository;
    private final ReservationRepository reservationRepository;
    private final Clock clock;

    @Autowired
    public ReservationReferenceGeneratorService(
            ReservationReferenceCounterRepository counterRepository,
            ReservationRepository reservationRepository
    ) {
        this(counterRepository, reservationRepository, Clock.systemUTC());
    }

    ReservationReferenceGeneratorService(
            ReservationReferenceCounterRepository counterRepository,
            ReservationRepository reservationRepository,
            Clock clock
    ) {
        this.counterRepository = counterRepository;
        this.reservationRepository = reservationRepository;
        this.clock = clock;
    }

    @Transactional
    public String nextReservationReference() {
        return nextReservationReference(Instant.now(clock));
    }

    @Transactional
    public String nextReservationReference(Instant instant) {
        int year = instant.atZone(ZoneOffset.UTC).getYear();
        ReservationReferenceCounterEntity counter = counterRepository.findForUpdate(RESERVATION_PREFIX, year)
                .orElseGet(() -> createCounter(year));

        int maxFromReservations = reservationRepository.findMaxReferenceSequenceForYear(RESERVATION_PREFIX, year);
        int currentValue = Math.max(counter.getLastValue(), maxFromReservations);
        int nextValue = currentValue + 1;
        counter.setLastValue(nextValue);
        counterRepository.save(counter);

        return RESERVATION_PREFIX + "-" + year + "-" + String.format("%04d", nextValue);
    }

    private ReservationReferenceCounterEntity createCounter(int year) {
        ReservationReferenceCounterEntity counter = new ReservationReferenceCounterEntity();
        counter.setPrefix(RESERVATION_PREFIX);
        counter.setYearValue(year);
        counter.setLastValue(0);
        return counter;
    }
}
