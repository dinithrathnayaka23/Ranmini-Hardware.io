"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FolderPlus } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Alert, type AlertTone } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { TextField } from "@/shared/components/ui/text-field";

import { createCategory } from "../actions";
import {
  categoryFormSchema,
  type CategoryFormValues,
} from "../schemas/category.schema";

const BLANK: CategoryFormValues = { name: "" };

/**
 * Adds a category to the shop's list.
 *
 * <p>One field, because one field is all a category is. The display order is
 * not asked for: a new category goes to the end of the row and is moved from
 * the list beside this, which is a far easier thing to get right than typing a
 * number and guessing what the other categories are already using.
 */
export function CategoryAddForm() {
  const [notice, setNotice] = React.useState<{
    tone: AlertTone;
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: BLANK,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = async (values: CategoryFormValues) => {
    setNotice(null);

    const result = await createCategory(values);
    setNotice({ tone: result.success ? "success" : "danger", message: result.message });

    if (result.success) {
      // Cleared and refocused only on success. A rejected name — a duplicate,
      // most likely — should stay on screen to be edited rather than retyped.
      reset(BLANK);
      setFocus("name");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <FolderPlus aria-hidden className="size-[18px] text-brand-600" />
          Add a Category
        </CardTitle>
      </CardHeader>

      <CardBody>
        <p className="text-sm leading-relaxed text-muted">
          Name it the way the shelf is labelled. Cashiers see this wording on the
          filter buttons at the till.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-4">
          {notice ? <Alert tone={notice.tone} message={notice.message} /> : null}

          <TextField
            label="Category Name"
            placeholder="e.g. Plumbing"
            autoComplete="off"
            error={errors.name?.message}
            {...register("name")}
          />

          <Button
            type="submit"
            isLoading={isSubmitting}
            loadingText="Adding…"
            className="w-full"
          >
            <FolderPlus aria-hidden className="size-4" />
            Add Category
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
