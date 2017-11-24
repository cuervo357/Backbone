import { Observable } from "rxjs";
import { Component } from "@angular/core";
import { Http, Response } from "@angular/http";

import { AppSettings } from "../app-settings/app-settings";
import { Element } from "../main/core/entities/element";
import { Project } from "../main/core/entities/project";
import { User } from "../main/core/entities/user";
import { AppHttp } from "../main/core/app-http.service";
import { AuthService } from "../main/core/auth.service";
import { getUniqueValue } from "../main/shared/utils";

@Component({
    selector: "odata-element-item",
    templateUrl: "odata-element-item.component.html"
})
export class ODataElementItemComponent {

    get anotherUserId(): number {
        return 2;
    }
    appHttp: AppHttp;
    get currentUser(): User {
        return this.authService.currentUser;
    }
    get invalidUserId(): number {
        return -1;
    }

    constructor(
        private authService: AuthService,
        http: Http) {
        this.appHttp = http as AppHttp;
    }

    createAnother(): void {
        this.create(this.anotherUserId).subscribe(this.handleResponse);
    }

    createOwn(): void {
        this.create(this.currentUser.Id).subscribe(this.handleResponse);
    }

    deleteAnother(): void {
        this.delete(this.anotherUserId).subscribe(this.handleResponse);
    }

    deleteNotFound(): void {
        const url = this.getODataUrl(this.invalidUserId);
        this.appHttp.delete(url).subscribe(this.handleResponse);
    }

    deleteOwn(): void {
        this.delete(this.currentUser.Id).subscribe(this.handleResponse);
    }

    updateAnother(): void {
        this.update(this.anotherUserId).subscribe(this.handleResponse);
    }

    updateNotFound(): void {
        const url = this.getODataUrl(this.invalidUserId);
        this.appHttp.patch(url, {}).subscribe(this.handleResponse);
    }

    updateOwn(): void {
        this.update(this.currentUser.Id).subscribe(this.handleResponse);
    }

    private create(userId: number): Observable<Response> {

        return this.getElement(userId).mergeMap((element) => {

            var elementItem = {
                ElementId: element.Id,
                Name: `New item ${getUniqueValue()}`
            };

            const url = `${AppSettings.serviceODataUrl}/ElementItem`;

            return this.appHttp.post(url, elementItem);
        });
    }

    private delete(userId: number): Observable<Response> {

        return this.getElement(userId, true).mergeMap((element) => {

            var elementItem = element.ElementItemSet[0];

            const url = this.getODataUrl(elementItem.Id);

            return this.appHttp.delete(url);
        });
    }

    private getODataUrl(elementItemId: number) {
        return `${AppSettings.serviceODataUrl}/ElementItem(${elementItemId})`;
    }

    private getElement(userId: number, checkHasElementItem: boolean = false): Observable<Element> {

        const url = `${AppSettings.serviceODataUrl}/Project?$expand=ElementSet/ElementItemSet&$filter=UserId eq ${userId}`;

        return this.appHttp.get(url)
            .map((response: Response) => {

                var results = (response as any).value as Project[];

                var project = results[0];

                if (!project) {
                    throw new Error(`Create a new project first - user: ${userId}`);
                }

                var element = project.ElementSet[0];

                if (!element) {
                    throw new Error(`Create a new element first - user: ${userId} - project: ${project.Id}`);
                }

                if (checkHasElementItem && !element.ElementItemSet[0]) {
                    throw new Error(`Create a new item first - user: ${userId} - project: ${project.Id} - element: ${element.Id}`);
                }

                return element;
            });
    }

    private handleResponse(response: Response) {
        console.log("response", response);
    }

    private update(userId: number): Observable<Response> {

        return this.getElement(userId, true).mergeMap((element) => {

            var elementItem = element.ElementItemSet[0];

            var body = {
                Name: `Updated item ${getUniqueValue()}`,
                RowVersion: elementItem.RowVersion
            };

            const url = this.getODataUrl(elementItem.Id);

            return this.appHttp.patch(url, body);
        });
    }
}
