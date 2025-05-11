"use client";

import { FC, useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  guardReportSchema,
  GuardReportFormValues,
  lightsOffLocationsArray,
  lockedLocationsArray,
  roundsCompletedOptionsArray,
  imageUploadLocationsArray,
} from "@/lib/form-schema";
import { submitGuardReport } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  LightbulbOff,
  Lock,
  Repeat,
  Camera,
  AlertCircle,
} from "lucide-react";

export const smartResizeImage = async (
  file: File,
  maxWidth = 1024,
  maxSizeMB = 1,
  quality = 0.8
): Promise<File> => {
  if (file.size / 1024 / 1024 < maxSizeMB) return file;

  const imageBitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / imageBitmap.width);
  const width = imageBitmap.width * scale;
  const height = imageBitmap.height * scale;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(imageBitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("toBlob() failed"));
        resolve(new File([blob], file.name, { type: blob.type }));
      },
      file.type,
      quality
    );
  });
};

const normalizeLocationNameClient = (
  name: string
): keyof GuardReportFormValues => {
  return `image${name.replace(
    /[^a-zA-Z0-9]/g,
    ""
  )}` as keyof GuardReportFormValues;
};

const initialFormState = {
  success: false,
  message: "",
  errors: undefined,
};

interface FormErrorProps {
  messages?: string[];
}

const FormError: FC<FormErrorProps> = ({ messages }) => {
  if (!messages || messages.length === 0) return null;
  return (
    <div className="flex items-center space-x-2 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      <span>{messages.join(", ")}</span>
    </div>
  );
};

export const GuardForm: FC = () => {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState(initialFormState);
  const [fileNames, setFileNames] = useState<Record<string, string>>({});

  const {
    register,
    control,
    formState: { errors },
    handleSubmit,
    reset,
    setValue,
  } = useForm<GuardReportFormValues>({
    resolver: zodResolver(guardReportSchema),
    mode: "onSubmit",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: GuardReportFormValues) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("guardName", data.guardName);
    formData.append("lightsOffLocation", data.lightsOffLocation);
    formData.append("lockedLocation", data.lockedLocation);
    formData.append("roundsCompleted", data.roundsCompleted);

    imageUploadLocationsArray.forEach((location) => {
      const field = normalizeLocationNameClient(location);
      const file = data[field];
      if (file instanceof File) {
        formData.append(field, file);
      }
    });

    const result = await submitGuardReport(undefined, formData);
    setState(result);
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (state.success) {
      toast({ title: "Success", description: state.message });
      formRef.current?.reset();
      reset();
      setFileNames({});
    } else if (state.message && !state.success) {
      const title = state.errors ? "Validation Error" : "Submission Error";
      toast({
        title,
        description: state.message,
        variant: "destructive",
      });
    }
  }, [state, toast, reset]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    fieldName: keyof GuardReportFormValues
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      setValue(fieldName, undefined, { shouldValidate: true });
      setFileNames((prev) => ({ ...prev, [fieldName]: "" }));
      return;
    }

    try {
      // ✅ Only resize if needed (auto-skip small files)
      const finalFile = await smartResizeImage(file, 1024, 1, 0.7);

      setValue(fieldName, finalFile, { shouldValidate: true });
      setFileNames((prev) => ({ ...prev, [fieldName]: finalFile.name }));
    } catch (error) {
      console.error("Resize failed:", error);
      setValue(fieldName, undefined, { shouldValidate: true });
      setFileNames((prev) => ({ ...prev, [fieldName]: "" }));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">
          Guard Report Form
        </CardTitle>
        <CardDescription className="text-center">
          Please fill out all fields accurately.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} ref={formRef} noValidate>
        <CardContent className="space-y-6">
          <div className="space-y-4 p-4 border rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold flex items-center">
              <User className="mr-2 h-5 w-5 text-primary" /> Information
            </h3>
            <div className="space-y-2">
              <Label htmlFor="guardName">Guard Name</Label>
              <Input
                id="guardName"
                {...register("guardName")}
                placeholder="Enter your full name"
                aria-invalid={!!errors.guardName}
              />
              <FormError
                messages={
                  errors.guardName?.message ? [errors.guardName.message] : []
                }
              />
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold flex items-center">
              <LightbulbOff className="mr-2 h-5 w-5 text-primary" /> Lights &
              Locks
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lightsOffLocation">
                  Lights Switched Off Location
                </Label>
                <Controller
                  name="lightsOffLocation"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        id="lightsOffLocation"
                        aria-invalid={!!errors.lightsOffLocation}>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {lightsOffLocationsArray.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {loc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormError
                  messages={
                    errors.lightsOffLocation?.message
                      ? [errors.lightsOffLocation.message]
                      : []
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lockedLocation">Locked Location</Label>
                <Controller
                  name="lockedLocation"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        id="lockedLocation"
                        aria-invalid={!!errors.lockedLocation}>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {lockedLocationsArray.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {loc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormError
                  messages={
                    errors.lockedLocation?.message
                      ? [errors.lockedLocation.message]
                      : []
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold flex items-center">
              <Repeat className="mr-2 h-5 w-5 text-primary" /> Rounds Completed
            </h3>
            <div className="space-y-2">
              <Label htmlFor="roundsCompleted">Number of Rounds</Label>
              <Controller
                name="roundsCompleted"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      id="roundsCompleted"
                      aria-invalid={!!errors.roundsCompleted}>
                      <SelectValue placeholder="Select rounds" />
                    </SelectTrigger>
                    <SelectContent>
                      {roundsCompletedOptionsArray.map((num) => (
                        <SelectItem key={num} value={num}>
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FormError
                messages={
                  errors.roundsCompleted?.message
                    ? [errors.roundsCompleted.message]
                    : []
                }
              />
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold flex items-center">
              <Camera className="mr-2 h-5 w-5 text-primary" /> Location Images
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {imageUploadLocationsArray.map((location) => {
                const fieldName = normalizeLocationNameClient(location);
                return (
                  <div key={location} className="space-y-2">
                    <Label htmlFor={fieldName}>{location}</Label>
                    <Input
                      id={fieldName}
                      type="file"
                      accept="image/*"
                      name={fieldName}
                      capture="environment" // opens camera directly
                      onChange={(e) => handleFileChange(e, fieldName)}
                      aria-invalid={!!errors[fieldName]}
                      className="file:text-primary file:font-semibold hover:file:bg-primary/10"
                    />
                    {fileNames[fieldName] && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Selected: {fileNames[fieldName]}
                      </p>
                    )}
                    <FormError
                      messages={
                        (errors as any)?.[fieldName]?.message
                          ? [(errors as any)[fieldName].message]
                          : []
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                Submitting...
              </span>
            ) : (
              "Submit Report"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
