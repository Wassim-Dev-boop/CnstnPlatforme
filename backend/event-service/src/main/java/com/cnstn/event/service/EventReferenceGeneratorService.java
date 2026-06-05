package com.cnstn.event.service;

import com.cnstn.event.entity.EventReferenceCounterEntity;
import com.cnstn.event.repository.EventRepository;
import com.cnstn.event.repository.EventReferenceCounterRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventReferenceGeneratorService {

    private static final String EVENT_PREFIX = "EVT";

    private final EventReferenceCounterRepository counterRepository;
    private final EventRepository eventRepository;
    private final Clock clock;

    @Autowired
    public EventReferenceGeneratorService(
            EventReferenceCounterRepository counterRepository,
            EventRepository eventRepository
    ) {
        this(counterRepository, eventRepository, Clock.systemUTC());
    }

    EventReferenceGeneratorService(
            EventReferenceCounterRepository counterRepository,
            EventRepository eventRepository,
            Clock clock
    ) {
        this.counterRepository = counterRepository;
        this.eventRepository = eventRepository;
        this.clock = clock;
    }

    @Transactional
    public String nextEventReference() {
        return nextEventReference(Instant.now(clock));
    }

    @Transactional
    public String nextEventReference(Instant instant) {
        int year = instant.atZone(ZoneOffset.UTC).getYear();
        EventReferenceCounterEntity counter = counterRepository.findForUpdate(EVENT_PREFIX, year)
                .orElseGet(() -> createCounter(year));
        int maxPersisted = eventRepository.findMaxReferenceSequence(EVENT_PREFIX, year);

        if (counter.getLastValue() < maxPersisted) {
            counter.setLastValue(maxPersisted);
        }

        int nextValue = counter.getLastValue() + 1;
        counter.setLastValue(nextValue);
        counterRepository.save(counter);

        return EVENT_PREFIX + "-" + year + "-" + String.format("%04d", nextValue);
    }

    private EventReferenceCounterEntity createCounter(int year) {
        EventReferenceCounterEntity counter = new EventReferenceCounterEntity();
        counter.setPrefix(EVENT_PREFIX);
        counter.setYearValue(year);
        counter.setLastValue(eventRepository.findMaxReferenceSequence(EVENT_PREFIX, year));
        return counter;
    }
}
