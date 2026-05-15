import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface NavLinkDto {
  path: string;
  label: string;
  exact: boolean;
}

export interface NavShellDto {
  appName: string;
  links: NavLinkDto[];
}

@Injectable({ providedIn: 'root' })
export class NavApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/nav/shell`;

  getShell(): Observable<NavShellDto> {
    return this.http.get<NavShellDto>(this.url);
  }
}
