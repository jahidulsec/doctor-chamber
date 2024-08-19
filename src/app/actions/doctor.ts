'use server';

import { decrypt } from '@/lib/session';
import { cookies } from 'next/headers';
import { z } from 'zod';
import db from '../../../db/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const addSchema = z.object({
  fullName: z.string().min(1),
  designation: z.string().optional(),
  email: z.string().nullable(),
});

export const addDoctor = async (prevState: unknown, formData: FormData) => {
  const result = addSchema.safeParse(Object.fromEntries(formData.entries()));

  if (result.success === false) {
    return { error: result.error.formErrors.fieldErrors, success: null, toast: null };
  }

  const data = result.data;
  const cookie = cookies().get('session')?.value;
  const session = await decrypt(cookie);
  const user = await decrypt(session?.userId as string);

  if (session?.userId == null) {
    return redirect('/login');
  }

  console.log(session);

  const doctorPrev = await db.doctor.findFirst({ orderBy: { createdAt: 'desc' } });
  const slug =
    Number(doctorPrev?.id || 0) + 1 + '-' + data.fullName.replaceAll('.', '').split(' ').join('-').toLowerCase();

  try {
    await db.doctor.create({
      data: {
        fullName: data.fullName,
        designation: data.designation,
        email: data.email,
        adminId: session?.userId as string,
        slug: slug,
      },
    });

    revalidatePath('/');
    revalidatePath('/admin');

    return { error: null, success: 'Doctor has been added', toast: null };
  } catch (error) {
    console.log(error);
    return { error: null, success: null, toast: 'Something went wrong' };
  }
};
