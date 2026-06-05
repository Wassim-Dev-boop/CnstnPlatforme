package com.cnstn.ged.service;

import com.cnstn.ged.entity.GedReferenceCounterEntity;
import com.cnstn.ged.repository.GedReferenceCounterRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GedReferenceGeneratorService {

    private static final String PREFIX = "DOC";

    private final GedReferenceCounterRepository counterRepository;
    private final Clock clock;

    @Autowired
    public GedReferenceGeneratorService(GedReferenceCounterRepository counterRepository) {
        this(counterRepository, Clock.systemUTC());
    }

    GedReferenceGeneratorService(GedReferenceCounterRepository counterRepository, Clock clock) {
        this.counterRepository = counterRepository;
        this.clock = clock;
    }

    @Transactional
    public String nextReference() {
        return nextReference(Instant.now(clock));
    }

    @Transactional
    public String nextReference(Instant instant) {
        int year = instant.atZone(ZoneOffset.UTC).getYear();
        GedReferenceCounterEntity counter = counterRepository.findForUpdate(PREFIX, year)
                .orElseGet(() -> createCounter(year));

        int nextValue = counter.getLastValue() + 1;
        counter.setLastValue(nextValue);
        counterRepository.save(counter);

        return PREFIX + "-" + year + "-" + String.format("%04d", nextValue);
    }

    private GedReferenceCounterEntity createCounter(int year) {
        GedReferenceCounterEntity counter = new GedReferenceCounterEntity();
        counter.setPrefix(PREFIX);
        counter.setYearValue(year);
        counter.setLastValue(0);
        return counter;
    }
}
