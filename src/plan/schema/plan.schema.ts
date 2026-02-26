import { PlanState } from "../enum/planstate.enum";

export class Plan{
    id?: string;
    planName?: string;
    planCode?: string; // e.g. SSLC-PLAN-001
    description?: string;
    state?: PlanState;
    price?: number;
    features?: string[];
    createdAt?: Date;
    updatedAt?: Date;
    duration?:number;
    priority?: number;

    constructor(partial: Partial<Plan>) {
        this.priority = 3;
        this.duration = 30;69
        Object.assign(this, partial);
    }

}
export class PlanSchema extends Plan {
    constructor(partial: Partial<PlanSchema>) {
        super(partial);
    }
}