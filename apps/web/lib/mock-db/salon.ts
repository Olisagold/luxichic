import type { AdminService, AdminUser, AvailabilityBlock, Specialist } from '@/types/admin';
import { logActivity, updateDb } from '@/lib/mock-db/db';
import { generateId } from '@/lib/utils/references';

/** Salon service — services, specialists and availability. Swap for API calls later. */

export function saveService(actor: AdminUser, s: AdminService) {
  updateDb((d) => {
    const exists = d.services.some((x) => x.slug === s.slug);
    d.services = exists ? d.services.map((x) => x.slug === s.slug ? s : x) : [...d.services, s];
    logActivity(d, actor, 'Salon', exists ? 'Edited service' : 'Created service', s.name, `/admin/salon/services/${s.slug}`);
  });
}

export function setServiceStatus(actor: AdminUser, slug: string, status: AdminService['status']) {
  updateDb((d) => {
    const s = d.services.find((x) => x.slug === slug);
    if (!s) return;
    s.status = status;
    logActivity(d, actor, 'Salon', status === 'published' ? 'Published service' : status === 'archived' ? 'Archived service' : 'Unpublished service', s.name);
  });
}

export function deleteService(actor: AdminUser, slug: string) {
  updateDb((d) => {
    const s = d.services.find((x) => x.slug === slug);
    d.services = d.services.filter((x) => x.slug !== slug);
    d.specialists.forEach((sp) => {
      sp.serviceSlugs = sp.serviceSlugs.filter((x) => x !== slug);
    });
    logActivity(d, actor, 'Salon', 'Deleted service', s?.name);
  });
}

export function saveSpecialist(actor: AdminUser, sp: Specialist) {
  updateDb((d) => {
    const exists = d.specialists.some((x) => x.id === sp.id);
    d.specialists = exists ? d.specialists.map((x) => x.id === sp.id ? sp : x) : [...d.specialists, sp];
    logActivity(d, actor, 'Salon', exists ? 'Edited specialist' : 'Added specialist', sp.name);
  });
}

export function deleteSpecialist(actor: AdminUser, id: string) {
  updateDb((d) => {
    const sp = d.specialists.find((x) => x.id === id);
    d.specialists = d.specialists.filter((x) => x.id !== id);
    logActivity(d, actor, 'Salon', 'Removed specialist', sp?.name);
  });
}

/** Adds or removes a specialist from a service without touching their other assignments. */
export function assignSpecialist(actor: AdminUser, specialistId: string, serviceSlug: string, assigned: boolean) {
  updateDb((d) => {
    const sp = d.specialists.find((x) => x.id === specialistId);
    if (!sp) return;
    sp.serviceSlugs = assigned ? Array.from(new Set([...sp.serviceSlugs, serviceSlug])) : sp.serviceSlugs.filter((x) => x !== serviceSlug);
    const service = d.services.find((s) => s.slug === serviceSlug);
    logActivity(d, actor, 'Salon', assigned ? 'Assigned specialist' : 'Unassigned specialist', `${sp.name} · ${service?.name ?? serviceSlug}`);
  });
}

export function addBlock(actor: AdminUser, block: Omit<AvailabilityBlock, 'id' | 'createdAt' | 'createdBy'>) {
  updateDb((d) => {
    d.blocks = [{ ...block, id: generateId('blk'), createdAt: new Date().toISOString(), createdBy: actor.fullName }, ...d.blocks];
    const what = block.start ? `${block.start}${block.end ? `–${block.end}` : ''}` : 'Entire day';
    logActivity(d, actor, 'Salon', 'Blocked availability', `${block.date} · ${what}`, '/admin/salon/availability');
  });
}

export function removeBlock(actor: AdminUser, id: string) {
  updateDb((d) => {
    const b = d.blocks.find((x) => x.id === id);
    d.blocks = d.blocks.filter((x) => x.id !== id);
    logActivity(d, actor, 'Salon', 'Removed availability block', b ? `${b.date} ${b.start ?? 'all day'}` : undefined);
  });
}