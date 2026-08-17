import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  Fuel,
  Check,
  X,
  AlertCircle,
  MapPin,
  ExternalLink,
  Navigation,
  Loader2
} from "lucide-react";
import { Lancamento, Veiculo, ContaBancaria, CategoriaCustomizada } from "../types";
import { generateNewId } from "../services/api";
import { parseCurrency, formatCurrency } from "../utils/formatters";

interface Props {
  lancamentos: Lancamento[];
  veiculos: Veiculo[];
  contas: ContaBancaria[];
  categoriasCustom?: CategoriaCustomizada[];
  onSaveLancamento: (lancamento: Lancamento) => Promise<void>;
  onSaveCategoria?: (categoria: CategoriaCustomizada) => Promise<void>;
  onDeleteLancamento: (id: string) => Promise<void>;
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
  initialFuelingMode?: boolean;
}

function isReceitaItem(l: any): boolean {
  const tipo = (l.Tipo || l.tipo || "").toString().toUpperCase();
  const cat = (l.Categoria || l.categoria || "").toString().toUpperCase();
  return tipo === "RECEITA" || tipo === "RECEITAS" || cat === "RECEITA" || cat === "SALÁRIO" || cat === "SALARIO";
}

function isFuelItem(l: any): boolean {
  const tipo = (l.Tipo || l.tipo || "").toString().toUpperCase();
  const cat = (l.Categoria || l.categoria || "").toString().toUpperCase();
  return (
    tipo === "ABASTECIMENTO" ||
    tipo === "ABASTECIMENTOS" ||
    cat === "ABASTECIMENTO" ||
    cat === "ABASTECIMENTOS" ||
    cat.includes("COMBUSTIVEL") ||
    cat.includes("COMBUSTÍVEL") ||
    Boolean(l.Nome_Posto || l.Posto || l["Nome_Posto"]) ||
    parseCurrency(l.Litros) > 0
  );
}

function isExcludedItem(l: any): boolean {
  const status = (l.Status || l.status || "").toString().toUpperCase();
  return status === "EXCLUÍDO" || status === "EXCLUIDO" || status === "DELETED";
}

export const LancamentosView: React.FC<Props> = ({
  lancamentos,
  veiculos,
  contas,
  categoriasCustom = [],
  onSaveLancamento,
  onSaveCategoria,
  onDeleteLancamento,
  isModalOpen,
  onCloseModal,
  onOpenModal,
  initialFuelingMode = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [editingItem, setEditingItem] = useState<Lancamento | null>(null);
  const [saving, setSaving] = useState(false);
  const [capturingGps, setCapturingGps] = useState(false);

  // Função auxiliar para capturar geolocalização do navegador
  const getCoordinates = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
        },
        (err) => {
          console.warn("Geolocalização não autorizada ou indisponível:", err.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    });
  };

  const handleCaptureGpsNow = async () => {
    setCapturingGps(true);
    try {
      const coords = await getCoordinates();
      if (coords) {
        setFormData((prev) => ({
          ...prev,
          Localizacao_Do_Posto: `${coords.lat},${coords.lng}`,
        }));
      }
    } finally {
      setCapturingGps(false);
    }
  };

  const openMapsForLancamento = (item: Lancamento) => {
    const loc = (item.Localizacao_Do_Posto || "").trim();
    const postoName = (item.Posto || item.Nome_Posto || "").trim();
    const coordMatch = loc.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = coordMatch[1];
      const lng = coordMatch[3];
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank", "noopener,noreferrer");
    } else if (loc) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`, "_blank", "noopener,noreferrer");
    } else if (postoName) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(postoName)}`, "_blank", "noopener,noreferrer");
    }
  };

  // Display strings for real-time currency typing mask
  const [valorDisplay, setValorDisplay] = useState<string>("");
  const [valorPagoDisplay, setValorPagoDisplay] = useState<string>("");
  const [litrosDisplay, setLitrosDisplay] = useState<string>("");
  const [precoLitroDisplay, setPrecoLitroDisplay] = useState<string>("");

  // Helper to format currency mask in real-time as user types numbers (e.g. 10000 -> 100,00)
  const formatCurrencyInput = (raw: string): { numeric: number; formatted: string } => {
    const digits = raw.replace(/\D/g, "");
    if (!digits || digits === "0" || digits === "00") {
      return { numeric: 0, formatted: "" };
    }
    const num = Number(digits) / 100;
    const formatted = num.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return { numeric: num, formatted };
  };

  // Helper to format 3-decimal price input in real-time (e.g. 5890 -> 5,890 or 589 -> 5,89)
  const formatPricePerLiterInput = (raw: string): { numeric: number; formatted: string } => {
    // Allows normal decimal entry with comma or dot
    const cleanStr = raw.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(cleanStr) || 0;
    return { numeric: num, formatted: raw };
  };

  const defaultVeic = veiculos[0];
  const defaultMotorista = defaultVeic?.Motorista ? defaultVeic.Motorista.trim() : "";

  // Form State
  const [formData, setFormData] = useState<Partial<Lancamento>>({
    Data: new Date().toISOString().split("T")[0],
    Tipo: initialFuelingMode ? "Abastecimento" : "Despesa",
    Categoria: initialFuelingMode ? "ABASTECIMENTO" : "Alimentação",
    Descricao: "",
    Valor: 0,
    Valor_Pago: 0,
    Conta: "",
    Forma_Pagamento: "PIX",
    Status: "Pago",
    Observacoes: "",
    Veiculo: defaultVeic?.Modelo || "",
    Km_Atual: defaultVeic?.Km_Atual || 0,
    Litros: 0,
    Preco_Litro: 0,
    Posto: "",
    Motorista: defaultMotorista,
    Completou_O_Tanque: "SIM",
    Localizacao_Do_Posto: "",
    Comprovante_Url: "",
  });

  // Lista de motoristas únicos cadastrados na aba 9_Veículos e em lançamentos anteriores
  const motoristasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    veiculos.forEach((v) => {
      if (v.Motorista && v.Motorista.trim()) {
        set.add(v.Motorista.trim());
      }
    });
    lancamentos.forEach((l) => {
      if (l.Motorista && l.Motorista.trim()) {
        set.add(l.Motorista.trim());
      }
    });
    return Array.from(set);
  }, [veiculos, lancamentos]);

  // Lista dinâmica de categorias disponíveis para Despesas / Receitas / Abastecimentos
  const categoriasDisponiveis = useMemo(() => {
    const isReceita = (formData.Tipo || "").toLowerCase() === "receita";
    const isAbastecimento =
      (formData.Tipo || "").toLowerCase() === "abastecimento" ||
      (formData.Categoria || "").toUpperCase() === "ABASTECIMENTO";

    const defaults = isAbastecimento
      ? ["ABASTECIMENTO"]
      : isReceita
      ? [
          "SALÁRIO",
          "INVESTIMENTOS",
          "RENDIMENTOS",
          "FREELANCE",
          "REEMBOLSO",
          "VENDAS",
          "RECEITA",
          "OUTROS",
        ]
      : [
          "ALIMENTAÇÃO",
          "SUPERMERCADO",
          "TRANSPORTE",
          "MORADIA",
          "CONTAS",
          "SAÚDE",
          "LAZER",
          "EDUCAÇÃO",
          "VESTUÁRIO",
          "SERVIÇOS",
          "IMPOSTOS",
          "VEÍCULO",
          "PET",
          "OUTROS",
        ];

    const fromCustom = (categoriasCustom || [])
      .filter((c) => {
        const t = String(c.Tipo || "").toUpperCase();
        if (isReceita) return t === "RECEITA" || t === "RECEITAS";
        if (isAbastecimento) return true;
        return t !== "RECEITA" && t !== "RECEITAS";
      })
      .map((c) => String(c.Nome || "").trim().toUpperCase())
      .filter((n) => n.length > 0);

    const fromLancamentos = lancamentos
      .filter((l) => {
        if (isReceita) return isReceitaItem(l);
        if (isAbastecimento) return isFuelItem(l);
        return !isReceitaItem(l);
      })
      .map((l) => String(l.Categoria || "").trim().toUpperCase())
      .filter((c) => c.length > 0);

    return Array.from(new Set([...defaults, ...fromCustom, ...fromLancamentos]));
  }, [formData.Tipo, formData.Categoria, categoriasCustom, lancamentos]);

  // Sync state when modal opens
  useEffect(() => {
    if (isModalOpen && !editingItem) {
      const defV = veiculos[0];
      const defM = defV?.Motorista ? defV.Motorista.trim() : "";
      setFormData({
        Data: new Date().toISOString().split("T")[0],
        Tipo: initialFuelingMode ? "Abastecimento" : "Despesa",
        Categoria: initialFuelingMode ? "ABASTECIMENTO" : "Alimentação",
        Descricao: "",
        Valor: 0,
        Valor_Pago: 0,
        Conta: "",
        Forma_Pagamento: "PIX",
        Status: "Pago",
        Observacoes: "",
        Veiculo: defV?.Modelo || "",
        Km_Atual: defV?.Km_Atual || 0,
        Litros: 0,
        Preco_Litro: 0,
        Posto: "",
        Motorista: defM,
        Completou_O_Tanque: "SIM",
        Localizacao_Do_Posto: "",
        Comprovante_Url: "",
        Tipo_Combustivel: initialFuelingMode ? "Gasolina Comum" : "",
      });
      setValorDisplay("");
      setValorPagoDisplay("");
      setLitrosDisplay("");
      setPrecoLitroDisplay("");
    }
  }, [isModalOpen, initialFuelingMode, veiculos]);

  const handleOpenNew = (isFuel: boolean = false) => {
    setEditingItem(null);
    const defV = veiculos[0];
    const defM = defV?.Motorista ? defV.Motorista.trim() : "";
    setFormData({
      Data: new Date().toISOString().split("T")[0],
      Tipo: isFuel ? "Abastecimento" : "Despesa",
      Categoria: isFuel ? "ABASTECIMENTO" : "Alimentação",
      Descricao: "",
      Valor: 0,
      Valor_Pago: 0,
      Conta: "",
      Forma_Pagamento: "PIX",
      Status: "Pago",
      Observacoes: "",
      Veiculo: defV?.Modelo || "",
      Km_Atual: defV?.Km_Atual || 0,
      Litros: 0,
      Preco_Litro: 0,
      Posto: "",
      Motorista: defM,
      Completou_O_Tanque: "SIM",
      Localizacao_Do_Posto: "",
      Comprovante_Url: "",
      Tipo_Combustivel: isFuel ? "Gasolina Comum" : "",
    });
    setValorDisplay("");
    setValorPagoDisplay("");
    setLitrosDisplay("");
    setPrecoLitroDisplay("");
    onOpenModal();
  };

  const handleOpenEdit = (item: Lancamento) => {
    setEditingItem(item);
    setFormData({
      ...item,
      Completou_O_Tanque: item.Completou_O_Tanque || "SIM",
      Localizacao_Do_Posto: item.Localizacao_Do_Posto || "",
      Comprovante_Url: item.Comprovante_Url || "",
      Tipo_Combustivel:
        item.Tipo_Combustivel ||
        (item.Categoria === "ABASTECIMENTO" || item.Tipo === "Abastecimento" ? "Gasolina Comum" : ""),
    });
    const valorNum = parseCurrency(item.Valor);
    setValorDisplay(valorNum > 0 ? formatCurrency(valorNum) : "");
    const valorPagoNum =
      item.Valor_Pago !== undefined && item.Valor_Pago !== null
        ? parseCurrency(item.Valor_Pago)
        : valorNum;
    setValorPagoDisplay(valorPagoNum > 0 ? formatCurrency(valorPagoNum) : "");
    const litNum = parseCurrency(item.Litros);
    setLitrosDisplay(litNum > 0 ? String(litNum) : "");
    const prcNum = parseCurrency(item.Preco_Litro);
    setPrecoLitroDisplay(prcNum > 0 ? String(prcNum) : "");
    onOpenModal();
  };

  // Cálculo de KM Percorrido e Média (Km/L) em tempo real
  const currentVeiculoName = formData.Veiculo || veiculos[0]?.Modelo || "";
  const matchedVeic = veiculos.find(
    (v) =>
      v.Modelo === currentVeiculoName ||
      v.Descricao === currentVeiculoName ||
      v.Placa === currentVeiculoName
  );
  const currentKm = parseCurrency(formData.Km_Atual);
  const currentLitros = parseCurrency(formData.Litros);

  let prevKmFound = 0;
  if (currentKm > 0) {
    const priorFuelRecords = lancamentos
      .filter(
        (l) =>
          isFuelItem(l) &&
          l.Id !== (editingItem?.Id || "") &&
          (l.Veiculo === currentVeiculoName || !currentVeiculoName || l.Descricao_Do_Veiculo === currentVeiculoName) &&
          parseCurrency(l.Km_Atual) > 0 &&
          parseCurrency(l.Km_Atual) < currentKm
      )
      .sort((a, b) => parseCurrency(b.Km_Atual) - parseCurrency(a.Km_Atual));

    if (priorFuelRecords.length > 0) {
      prevKmFound = parseCurrency(priorFuelRecords[0].Km_Atual);
    } else if (matchedVeic?.Km_Atual && matchedVeic.Km_Atual < currentKm) {
      prevKmFound = matchedVeic.Km_Atual;
    }
  }

  const previewKmPercorrido =
    prevKmFound > 0 && currentKm > prevKmFound ? currentKm - prevKmFound : 0;
  const previewMediaKmL =
    previewKmPercorrido > 0 && currentLitros > 0
      ? Number((previewKmPercorrido / currentLitros).toFixed(2))
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isFuel = formData.Categoria === "ABASTECIMENTO" || formData.Tipo === "Abastecimento";
      let precoLitro = parseCurrency(formData.Preco_Litro);
      let finalValor = parseCurrency(formData.Valor);
      let litros = parseCurrency(formData.Litros);
      const kmAtual = isFuel ? parseCurrency(formData.Km_Atual) : undefined;

      // Regra de cálculo automático de abastecimento:
      // Se Valor e Preco_Litro foram informados, calcula Litros = Valor / Preço_Litro
      if (isFuel) {
        if (finalValor > 0 && precoLitro > 0 && (litros === 0 || !litros)) {
          litros = Number((finalValor / precoLitro).toFixed(2));
        } else if (litros > 0 && precoLitro > 0 && finalValor === 0) {
          finalValor = Number((litros * precoLitro).toFixed(2));
        }
      }

      const finalValorPago =
        formData.Valor_Pago !== undefined &&
        formData.Valor_Pago !== null &&
        String(formData.Valor_Pago).trim() !== ""
          ? parseCurrency(formData.Valor_Pago)
          : finalValor;

      const descVeiculo = matchedVeic
        ? matchedVeic.Descricao || `${matchedVeic.Marca || ""} ${matchedVeic.Modelo} (${matchedVeic.Placa || ""})`.trim()
        : formData.Veiculo || "";
      const nomePosto = formData.Posto ? String(formData.Posto).trim() : "";
      let localizacaoPosto = formData.Localizacao_Do_Posto ? String(formData.Localizacao_Do_Posto).trim() : "";

      // Captura automática de GPS se for abastecimento e a localização ainda estiver vazia
      if (isFuel && !localizacaoPosto) {
        try {
          const coords = await getCoordinates();
          if (coords) {
            localizacaoPosto = `${coords.lat},${coords.lng}`;
          }
        } catch (e) {
          console.warn("GPS capture skipped:", e);
        }
      }

      const completouTanque = formData.Completou_O_Tanque || "SIM";
      const comprovanteUrl = formData.Comprovante_Url ? String(formData.Comprovante_Url).trim() : "";
      const kmPercorridoCalculado = previewKmPercorrido > 0 ? previewKmPercorrido : (formData.Km_Percorrido || 0);
      const mediaKmLCalculada = previewMediaKmL > 0 ? previewMediaKmL : (formData.Media_KmL || 0);

      const finalCategoria = isFuel
        ? "ABASTECIMENTO"
        : formData.Categoria
        ? String(formData.Categoria).trim().toUpperCase()
        : "OUTROS";

      // Salva nova categoria customizada na aba 11_Categorias_Customizadas se ainda não existir
      if (
        onSaveCategoria &&
        finalCategoria &&
        finalCategoria !== "ABASTECIMENTO"
      ) {
        const jaExiste = (categoriasCustom || []).some(
          (c) => String(c.Nome || "").trim().toUpperCase() === finalCategoria
        );
        if (!jaExiste) {
          const isReceita = (formData.Tipo || "").toLowerCase() === "receita";
          const novaCat: CategoriaCustomizada = {
            Id: generateNewId("CAT"),
            Nome: finalCategoria,
            Tipo: isReceita ? "Receita" : "Despesa",
            Icone: isReceita ? "TrendingUp" : "Tag",
            Cor_Hex: isReceita ? "#10b981" : "#6366f1",
          };
          onSaveCategoria(novaCat).catch((err) =>
            console.warn("Erro ao salvar nova categoria customizada:", err)
          );
        }
      }

      const itemToSave: Lancamento = {
        Id: editingItem?.Id || generateNewId("LANC"),
        Data: formData.Data || new Date().toISOString().split("T")[0],
        Tipo: isFuel ? "Abastecimento" : (formData.Tipo || "Despesa"),
        Categoria: finalCategoria,
        Subcategoria: formData.Subcategoria || "",
        Descricao: formData.Descricao || (isFuel ? `Abastecimento - ${formData.Veiculo || 'Veículo'}` : ""),
        Valor: finalValor,
        Valor_Pago: finalValorPago,
        Conta: formData.Conta || (contas[0]?.Nome || ""),
        Cartao: formData.Cartao || "",
        Forma_Pagamento: formData.Forma_Pagamento || "PIX",
        Status: formData.Status || "Pago",
        Observacoes: formData.Observacoes || "",
        Veiculo: isFuel ? (formData.Veiculo || veiculos[0]?.Modelo || "") : undefined,
        Km_Atual: kmAtual,
        Litros: isFuel ? litros : undefined,
        Preco_Litro: isFuel ? precoLitro : undefined,
        Posto: isFuel ? nomePosto : undefined,
        Motorista: formData.Motorista ? String(formData.Motorista).trim() : undefined,
        Completou_O_Tanque: isFuel ? completouTanque : undefined,
        Km_Percorrido: isFuel ? kmPercorridoCalculado : undefined,
        Media_KmL: isFuel ? mediaKmLCalculada : undefined,
        Descricao_Do_Veiculo: isFuel ? descVeiculo : undefined,
        Nome_Posto: isFuel ? nomePosto : undefined,
        Localizacao_Do_Posto: isFuel ? localizacaoPosto : undefined,
        Comprovante_Url: isFuel ? comprovanteUrl : undefined,
        Tipo_Combustivel: isFuel ? (formData.Tipo_Combustivel || "Gasolina Comum") : undefined,
      };

      await onSaveLancamento(itemToSave);
      onCloseModal();
    } catch (err) {
      console.error("Erro ao salvar lançamento:", err);
    } finally {
      setSaving(false);
    }
  };

  // Filtered List
  const filteredList = lancamentos
    .filter((item) => !isExcludedItem(item))
    .filter((item) => {
      if (filterType === "Despesa") {
        const tipo = (item.Tipo || "").toString().toUpperCase();
        return tipo === "DESPESA" || tipo === "DESPESAS" || !isReceitaItem(item);
      }
      if (filterType === "Receita") {
        return isReceitaItem(item);
      }
      if (filterType === "Abastecimento") {
        return isFuelItem(item);
      }
      return true;
    })
    .filter(
      (item) =>
        (item.Descricao || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.Categoria || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.Data).getTime() - new Date(a.Data).getTime());

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Lançamentos Financeiros</h2>
          <p className="text-xs text-slate-400">
            Aba oficial <code className="text-emerald-400 font-mono">1_Lancamentos</code> (Fonte principal de dados)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenNew(false)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
          <button
            onClick={() => handleOpenNew(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/20 font-medium rounded-xl text-xs transition-colors"
          >
            <Fuel className="w-4 h-4" />
            <span>Abastecer</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por descrição ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "Todos" },
            { id: "Despesa", label: "Despesas" },
            { id: "Receita", label: "Receitas" },
            { id: "Abastecimento", label: "Abastecimentos" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                filterType === tab.id
                  ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <p>Nenhum lançamento encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredList.map((item, idx) => {
              const isReceita = isReceitaItem(item);
              const isFuel = isFuelItem(item);

              return (
                <div
                  key={`${item.Id || 'lanc'}-${idx}`}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                        isFuel
                          ? "bg-amber-500/10 text-amber-400"
                          : isReceita
                          ? "bg-teal-500/10 text-teal-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {isFuel ? (
                        <Fuel className="w-4 h-4" />
                      ) : isReceita ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm truncate">
                          {item.Descricao}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
                          {item.Categoria}
                        </span>
                        {isFuel && item.Tipo_Combustivel && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-[10px] text-amber-300 border border-amber-500/20">
                            {item.Tipo_Combustivel}
                          </span>
                        )}
                        {isFuel && (item.Localizacao_Do_Posto || item.Posto) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openMapsForLancamento(item);
                            }}
                            title={
                              item.Localizacao_Do_Posto
                                ? `Abrir Google Maps (${item.Localizacao_Do_Posto})`
                                : `Buscar no Google Maps: ${item.Posto}`
                            }
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-medium transition-colors"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Mapa</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </button>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Data: <span className="text-slate-300">{item.Data}</span> • Conta:{" "}
                        <span className="text-slate-300">{item.Conta || "Principal"}</span>
                        {isFuel && parseCurrency(item.Litros) > 0 && (
                          <span className="text-amber-400 ml-2">
                            • {formatCurrency(item.Litros)}L @ R$ {formatCurrency(item.Preco_Litro)}/L
                            {parseCurrency(item.Km_Atual) > 0 && ` (${item.Km_Atual} KM)`}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-0 border-slate-800 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span
                        className={`text-sm font-bold ${
                          isReceita ? "text-teal-400" : "text-slate-200"
                        }`}
                      >
                        {isReceita ? "+" : "-"} R${" "}
                        {formatCurrency(item.Valor)}
                      </span>
                      <p className="text-[10px] text-slate-500">{item.Status}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteLancamento(item.Id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Excluir (Soft delete)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingItem ? "Editar Lançamento" : "Novo Lançamento / Abastecimento"}
              </h3>
              <button
                onClick={onCloseModal}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Tipo</label>
                  <select
                    value={formData.Tipo}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setFormData((prev) => ({
                        ...prev,
                        Tipo: t,
                        Categoria: t === "Abastecimento" ? "ABASTECIMENTO" : prev.Categoria,
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  >
                    <option value="Despesa">Despesa</option>
                    <option value="Receita">Receita</option>
                    <option value="Abastecimento">Abastecimento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Data</label>
                  <input
                    type="date"
                    value={formData.Data}
                    onChange={(e) => setFormData({ ...formData, Data: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Mercado, Salário, Abastecimento Shell..."
                  value={formData.Descricao}
                  onChange={(e) => setFormData({ ...formData, Descricao: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white placeholder-slate-600 uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Categoria</label>
                  <input
                    type="text"
                    list="categorias-lancamentos-list"
                    placeholder="Selecione ou digite..."
                    value={formData.Categoria || ""}
                    onChange={(e) => setFormData({ ...formData, Categoria: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white uppercase"
                    required
                  />
                  <datalist id="categorias-lancamentos-list">
                    {categoriasDisponiveis.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Valor Total (R$)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400 font-semibold text-sm select-none">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={valorDisplay}
                      onChange={(e) => {
                        const { numeric, formatted } = formatCurrencyInput(e.target.value);
                        setValorDisplay(formatted);
                        
                        // Atualização automática de Litros se Preço/Litro já estiver preenchido
                        const isFuel = formData.Categoria === "ABASTECIMENTO" || formData.Tipo === "Abastecimento";
                        const prc = Number(formData.Preco_Litro || 0);
                        let calculatedLitros = formData.Litros;
                        
                        if (isFuel && prc > 0 && numeric > 0) {
                          const lit = Number((numeric / prc).toFixed(2));
                          calculatedLitros = lit;
                          setLitrosDisplay(String(lit));
                        }
                        
                        setFormData((prev) => ({
                          ...prev,
                          Valor: numeric,
                          Litros: calculatedLitros,
                        }));
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 pl-10 text-white font-bold"
                      required={formData.Categoria !== "ABASTECIMENTO"}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Valor Pago (R$)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400 font-semibold text-sm select-none">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={valorPagoDisplay}
                      onChange={(e) => {
                        const { numeric, formatted } = formatCurrencyInput(e.target.value);
                        setValorPagoDisplay(formatted);
                        setFormData((prev) => ({ ...prev, Valor_Pago: numeric }));
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 pl-10 text-white font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Forma de Pagamento</label>
                  <input
                    type="text"
                    placeholder="Ex: PIX, Cartão, Dinheiro"
                    value={formData.Forma_Pagamento || ""}
                    onChange={(e) => setFormData({ ...formData, Forma_Pagamento: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Conta (Banco / Cartão de Débito)</label>
                <select
                  value={formData.Conta || ""}
                  onChange={(e) => setFormData({ ...formData, Conta: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                >
                  <option value="">Selecione uma conta...</option>
                  {contas.map((c) => (
                    <option key={c.Id || c.Nome} value={c.Nome}>
                      {c.Nome} {c.Tipo ? `(${c.Tipo})` : ""}
                    </option>
                  ))}
                  {formData.Conta && !contas.some((c) => c.Nome === formData.Conta) && (
                    <option value={formData.Conta}>{formData.Conta}</option>
                  )}
                </select>
              </div>

              {/* Extra Fueling Fields if Categoria === ABASTECIMENTO */}
              {(formData.Categoria === "ABASTECIMENTO" || formData.Tipo === "Abastecimento") && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
                  <span className="font-semibold text-amber-400 block flex items-center gap-1.5">
                    <Fuel className="w-4 h-4" /> Detalhes do Abastecimento (Espelho 4_Abastecimentos)
                  </span>

                  {/* Veículo e Motorista (Sugerido/Auto-preenchido da aba 9_Veículos) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Veículo</label>
                      <select
                        value={formData.Veiculo || ""}
                        onChange={(e) => {
                          const selectedVeicName = e.target.value;
                          const selectedVeic = veiculos.find(
                            (v) =>
                              v.Modelo === selectedVeicName ||
                              v.Descricao === selectedVeicName ||
                              v.Placa === selectedVeicName
                          );
                          setFormData((prev) => ({
                            ...prev,
                            Veiculo: selectedVeicName,
                            // Preenche automaticamente o motorista associado da aba 9_Veiculos
                            Motorista: selectedVeic?.Motorista ? selectedVeic.Motorista.trim() : prev.Motorista,
                            Km_Atual:
                              selectedVeic?.Km_Atual && selectedVeic.Km_Atual > 0
                                ? selectedVeic.Km_Atual
                                : prev.Km_Atual,
                          }));
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                      >
                        <option value="">Selecione o veículo...</option>
                        {veiculos.map((v) => (
                          <option key={v.Id || v.Placa} value={v.Modelo}>
                            {v.Modelo} {v.Placa ? `(${v.Placa})` : ""} {v.Motorista ? `• ${v.Motorista}` : ""}
                          </option>
                        ))}
                        {formData.Veiculo && !veiculos.some((v) => v.Modelo === formData.Veiculo) && (
                          <option value={formData.Veiculo}>{formData.Veiculo}</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">
                        Motorista
                      </label>
                      <input
                        type="text"
                        list="motoristas-cadastrados"
                        placeholder="Ex: Carlos / Alexandre"
                        value={formData.Motorista || ""}
                        onChange={(e) => setFormData({ ...formData, Motorista: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white uppercase"
                      />
                      <datalist id="motoristas-cadastrados">
                        {motoristasDisponiveis.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Tipo de Combustível */}
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      Tipo de Combustível
                    </label>
                    <select
                      value={formData.Tipo_Combustivel || "Gasolina Comum"}
                      onChange={(e) =>
                        setFormData({ ...formData, Tipo_Combustivel: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                    >
                      <option value="Álcool">Álcool</option>
                      <option value="Álcool Aditivado">Álcool Aditivado</option>
                      <option value="Gasolina Comum">Gasolina Comum</option>
                      <option value="Gasolina Aditivada">Gasolina Aditivada</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Litros</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ex: 16.97"
                        value={litrosDisplay}
                        onChange={(e) => {
                          const rawVal = e.target.value;
                          setLitrosDisplay(rawVal);
                          const cleanVal = rawVal.replace(/[^\d.,]/g, "").replace(",", ".");
                          const lit = parseFloat(cleanVal) || 0;
                          const prc = Number(formData.Preco_Litro || 0);
                          
                          // Se digitar Litros e já houver Preço/Litro, recalcula Valor Total se desejado
                          if (lit > 0 && prc > 0 && (!formData.Valor || formData.Valor === 0)) {
                            const total = Number((lit * prc).toFixed(2));
                            setValorDisplay(formatCurrency(total));
                            setFormData((prev) => ({
                              ...prev,
                              Litros: lit,
                              Valor: total,
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              Litros: lit,
                            }));
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Preço/Litro (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ex: 5,89"
                        value={precoLitroDisplay}
                        onChange={(e) => {
                          const rawVal = e.target.value;
                          setPrecoLitroDisplay(rawVal);
                          const cleanVal = rawVal.replace(/[^\d.,]/g, "").replace(",", ".");
                          const prc = parseFloat(cleanVal) || 0;
                          const currentValor = Number(formData.Valor || 0);
                          
                          // Cálculo em tempo real: Litros = Valor ÷ Preço_Litro
                          let calculatedLitros = formData.Litros;
                          if (currentValor > 0 && prc > 0) {
                            const lit = Number((currentValor / prc).toFixed(2));
                            calculatedLitros = lit;
                            setLitrosDisplay(String(lit));
                          }
                          
                          setFormData((prev) => ({
                            ...prev,
                            Preco_Litro: prc,
                            Litros: calculatedLitros,
                          }));
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">KM Atual (Hodômetro)</label>
                      <input
                        type="number"
                        placeholder="Ex: 85200"
                        value={formData.Km_Atual || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, Km_Atual: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Completou o Tanque?</label>
                      <select
                        value={formData.Completou_O_Tanque || "SIM"}
                        onChange={(e) => setFormData({ ...formData, Completou_O_Tanque: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                      >
                        <option value="SIM">SIM (Tanque Cheio)</option>
                        <option value="NÃO">NÃO (Parcial)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Posto de Combustível</label>
                      <input
                        type="text"
                        placeholder="Ex: Posto Ipiranga"
                        value={formData.Posto || ""}
                        onChange={(e) => setFormData({ ...formData, Posto: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white uppercase"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-400 text-[11px]">Localização / Coordenadas GPS</label>
                        <button
                          type="button"
                          onClick={handleCaptureGpsNow}
                          disabled={capturingGps}
                          className="text-[10px] text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-medium transition-colors"
                          title="Capturar coordenadas GPS do seu dispositivo agora"
                        >
                          {capturingGps ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Obtendo GPS...</span>
                            </>
                          ) : (
                            <>
                              <Navigation className="w-3 h-3" />
                              <span>Capturar GPS Atual</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Ex: -23.55052,-46.633308 ou Av. Brasil, 1500"
                          value={formData.Localizacao_Do_Posto || ""}
                          onChange={(e) => setFormData({ ...formData, Localizacao_Do_Posto: e.target.value.toUpperCase() })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 pl-7 text-white text-xs uppercase"
                        />
                        <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Comprovante (URL / Foto)</label>
                    <input
                      type="text"
                      placeholder="Ex: https://..."
                      value={formData.Comprovante_Url || ""}
                      onChange={(e) => setFormData({ ...formData, Comprovante_Url: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white text-xs"
                    />
                  </div>

                  {/* Cálculo Automático Estimado */}
                  {(previewKmPercorrido > 0 || previewMediaKmL > 0) && (
                    <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-2 flex items-center justify-between text-xs text-amber-300">
                      <span>KM Percorrido: <strong>+{previewKmPercorrido.toLocaleString("pt-BR")} km</strong></span>
                      <span>Média Estimada: <strong>{previewMediaKmL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} km/L</strong></span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Observações adicionais..."
                  value={formData.Observacoes || ""}
                  onChange={(e) => setFormData({ ...formData, Observacoes: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white placeholder-slate-600 resize-none uppercase"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
                >
                  {saving ? "Salvando..." : "Salvar Lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
