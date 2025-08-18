import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ClientEnergySection from "@/components/energy/ClientEnergySection";

const ClientEnergy = () => {
  return (
    <DashboardLayout>
      <ClientEnergySection />
    </DashboardLayout>
  );
};

export default ClientEnergy;