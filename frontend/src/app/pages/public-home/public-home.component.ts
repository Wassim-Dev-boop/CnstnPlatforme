import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './public-home.component.html',
  styleUrls: ['./public-home.component.css'],
})
export class PublicHomeComponent {
  readonly currentYear = new Date().getFullYear();

  readonly advantages = ['Sécurisé', 'Accessible', 'Centralisé', 'Fiable'];

  readonly integratedModules = [
    { title: 'GED', icon: '📄', description: 'Documents, versions et accès contrôlés. Stockage centralisé avec historique complet.' },
    { title: 'Événements', icon: '📅', description: 'Calendrier, validation et publication internes. Synchronisez tous vos événements.' },
    { title: 'Invitations', icon: '✉️', description: 'Gestion des confirmations et suivi des réponses. Relances automatiques.' },
    { title: 'Réservations', icon: '🏢', description: 'Salles et équipements logistiques en disponibilité réelle. Gestion intelligente.' },
    { title: 'Équipements', icon: '🔧', description: 'Suivi des ressources avec responsabilités claires. Inventaire centralisé.' },
    { title: 'Interventions', icon: '🎯', description: 'Demandes techniques et workflow de traitement. Suivi complet.' },
    { title: 'Notifications', icon: '🔔', description: 'Alertes métier en temps réel et suivi des actions utiles.' },
    { title: 'Administration', icon: '⚙️', description: 'Gestion utilisateurs, rôles, permissions et workflows. Contrôle total.' },
  ];

  readonly roleUseCases = [
    { role: 'Employé', tasks: 'Accès aux documents, réservations, consultations événements' },
    { role: 'Chef hiérarchique', tasks: 'Validation des demandes, suivi des interventions, gestion équipe' },
    { role: 'Responsable salle', tasks: 'Gestion réservations salles, planification, coordination' },
    { role: 'Responsable IT', tasks: 'Gestion interventions, tickets techniques, suivi incidents' },
    { role: 'Responsable qualité', tasks: 'Contrôle workflows, validation documents, rapports' },
    { role: 'Directeur DSN', tasks: 'Vision globale et tableaux de bord' },
    { role: 'Administrateur', tasks: 'Configuration globale, gestion utilisateurs, sécurité' },
  ];
}
