import React from "react";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const TEMPLATES = [
  {
    id: "custom",
    name: "Custom",
    color: "#8B5CF6",
    gradient: "from-purple-400 to-pink-400",
    description: "Create your own unique theme"
  },
  {
    id: "wedding",
    name: "Wedding",
    color: "#EC4899",
    gradient: "from-pink-300 to-rose-300",
    description: "Romantic pastels perfect for weddings"
  },
  {
    id: "birthday",
    name: "Birthday",
    color: "#F59E0B",
    gradient: "from-yellow-400 to-orange-400",
    description: "Fun and vibrant celebration colors"
  },
  {
    id: "corporate",
    name: "Corporate",
    color: "#3B82F6",
    gradient: "from-blue-500 to-cyan-500",
    description: "Professional and modern look"
  },
  {
    id: "graduation",
    name: "Graduation",
    color: "#10B981",
    gradient: "from-emerald-400 to-teal-400",
    description: "Achievement and success theme"
  },
  {
    id: "holiday",
    name: "Holiday",
    color: "#EF4444",
    gradient: "from-red-400 to-green-400",
    description: "Festive seasonal colors"
  }
];

export default function EventTemplateSelector({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {TEMPLATES.map((template) => (
        <motion.div
          key={template.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Card
            className={`cursor-pointer transition-all duration-200 ${
              selected === template.id
                ? "ring-4 ring-purple-400 shadow-lg"
                : "hover:shadow-md"
            }`}
            onClick={() => onSelect(template.id, template.color)}
          >
            <div className={`h-24 bg-gradient-to-br ${template.gradient} rounded-t-lg relative`}>
              {selected === template.id && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-purple-600" />
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
              <p className="text-xs text-gray-500">{template.description}</p>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}