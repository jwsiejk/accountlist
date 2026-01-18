"use client";

import { useCallback, useEffect, useState } from "react";

import type { RawAccountMapping } from "@/lib/account-mapping/schema";
import {
  loadTemplates,
  saveTemplates,
  type MappingTemplate,
} from "@/lib/account-mapping/templateStorage";

const buildTemplateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `template-${Date.now()}`;

type SaveTemplateParams = {
  vendorMapping: RawAccountMapping;
  partnerMapping: RawAccountMapping;
};

export const useMappingTemplates = () => {
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const persistTemplates = useCallback((next: MappingTemplate[]) => {
    setTemplates(next);
    saveTemplates(next);
  }, []);

  const saveCurrentTemplate = useCallback(
    ({ vendorMapping, partnerMapping }: SaveTemplateParams) => {
      if (!templateName.trim()) {
        return;
      }

      const nextTemplate: MappingTemplate = {
        id: buildTemplateId(),
        name: templateName.trim(),
        createdAt: new Date().toISOString(),
        vendorMapping,
        partnerMapping,
      };

      const nextTemplates = [nextTemplate, ...templates].slice(0, 10);
      persistTemplates(nextTemplates);
      setTemplateName("");
      setSelectedTemplateId(nextTemplate.id);
    },
    [persistTemplates, templateName, templates],
  );

  const applyTemplate = useCallback(
    (templateId: string) => {
      const template = templates.find((item) => item.id === templateId);
      if (!template) {
        return null;
      }

      return {
        vendorMapping: template.vendorMapping,
        partnerMapping: template.partnerMapping,
      };
    },
    [templates],
  );

  return {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    templateName,
    setTemplateName,
    saveCurrentTemplate,
    applyTemplate,
    persistTemplates,
  };
};
