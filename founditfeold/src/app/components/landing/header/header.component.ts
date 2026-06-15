import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular/src/icons';

@Component({
  selector: 'landing-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
  templateUrl: 'header.component.html',
})
export class Header{

}
