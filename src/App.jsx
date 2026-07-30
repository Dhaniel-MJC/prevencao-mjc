import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import {
  Check,
  AlertTriangle,
  X,
  ClipboardList,
  Building2,
  User,
  Calendar,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Loader2,
  Info,
  Send,
  CloudOff,
  CheckCircle2,
  LayoutDashboard,
} from "lucide-react";
import { SHEETS_ENDPOINT } from "./config";

const Dashboard = lazy(() => import("./Dashboard"));

// ————————————————————————————————————————————————————————————————
// Paleta — "prancheta de campo": papel técnico frio, estrutura em azul
// de engenharia, sinalização em laranja de segurança, semáforo de
// status (verde / âmbar / vermelho) que espelha literalmente as
// respostas Atende / Parcial / Não atende.
// ————————————————————————————————————————————————————————————————
export const C = {
  page: "#E7E9E2",
  paper: "#FFFFFF",
  paperAlt: "#F2F3EE",
  ink: "#1B2024",
  inkMuted: "#5B6570",
  inkFaint: "#8A9099",
  line: "#D3D7CC",
  lineStrong: "#B6BCAF",
  navy: "#0E3A5C",
  navyDeep: "#092A44",
  orange: "#F2661A",
  orangeDeep: "#C94F0F",
  green: "#2E7D46",
  greenBg: "#E4F0E7",
  amber: "#C98A0A",
  amberBg: "#F6ECDA",
  red: "#B23A2E",
  redBg: "#F5E4E1",
};

export const STATUS = {
  ATENDE: "atende",
  PARCIAL: "parcial",
  NAO_ATENDE: "nao_atende",
};

const STATUS_META = {
  [STATUS.ATENDE]: { label: "Atende", color: C.green, bg: C.greenBg, Icon: Check },
  [STATUS.PARCIAL]: { label: "Parcial", color: C.amber, bg: C.amberBg, Icon: AlertTriangle },
  [STATUS.NAO_ATENDE]: { label: "Não atende", color: C.red, bg: C.redBg, Icon: X },
};

// ————————————————————————————————————————————————————————————————
// Conteúdo base — itens de verificação por Norma Regulamentadora.
// Cobre as 36 NRs atualmente vigentes (NR-2 e NR-27 foram revogadas).
// O código de cada item indica a NR e a seção temática à qual ele se
// refere (ex.: 6.3 = NR-6, seção sobre certificação/CA). Para itens
// de normas cuja subdivisão exata eu não pude confirmar com certeza
// no texto oficial mais recente, o código reflete a seção temática
// e não o número literal do artigo — sempre confira a redação
// vigente em gov.br/trabalho-e-emprego antes de formalizar um laudo.
// ————————————————————————————————————————————————————————————————
const NRS = [
  {
    id: "nr1",
    numero: "NR-1",
    titulo: "Disposições Gerais e Gerenciamento de Riscos Ocupacionais",
    itens: [
      { cod: "1.5.7.1", texto: "PGR estabelecido, contendo Inventário de Riscos Ocupacionais e Plano de Ação" },
      { cod: "1.5.3.1.4", texto: "Inventário de riscos contempla riscos físicos, químicos, biológicos, ergonômicos, de acidentes e psicossociais" },
      { cod: "1.5.4.4.5", texto: "Levantamento de perigos e avaliação de riscos realizado, com classificação por nível de risco" },
      { cod: "1.5.5.2.1", texto: "Plano de ação elaborado indicando medidas de prevenção a introduzir, aprimorar ou manter" },
      { cod: "1.5.5.2.2", texto: "Cronograma e forma de acompanhamento de resultados definidos para cada medida de prevenção" },
      { cod: "1.5.5.3.2.1", texto: "Medidas de prevenção corrigidas quando o acompanhamento indica ineficácia" },
      { cod: "1.5.3.2", texto: "Trabalhadores informados sobre os riscos do inventário e as medidas do plano de ação" },
      { cod: "1.5.7.3.3", texto: "Inventário de riscos mantido atualizado, com histórico de revisões arquivado (mín. 20 anos)" },
      { cod: "1.4.1.1", texto: "Medidas de prevenção e combate ao assédio sexual e outras formas de violência adotadas (empresas com CIPA)" },
    ],
  },
  {
    id: "nr3",
    numero: "NR-3",
    titulo: "Embargo e Interdição",
    itens: [
      { cod: "3.1", texto: "Empresa conhece os critérios de risco grave e iminente aplicáveis à atividade" },
      { cod: "3.2", texto: "Procedimento de paralisação imediata em caso de risco grave e iminente" },
      { cod: "3.3", texto: "Registro de autos de embargo/interdição anteriores, se houver" },
      { cod: "3.4", texto: "Medidas corretivas após eventual embargo/interdição implementadas e documentadas" },
    ],
  },
  {
    id: "nr4",
    numero: "NR-4",
    titulo: "Serviços Especializados em Engenharia de Segurança e em Medicina do Trabalho (SESMT)",
    itens: [
      { cod: "4.4.2", texto: "SESMT individual constituído quando o estabelecimento se enquadra no Anexo II" },
      { cod: "4.4.3 / 4.4.4", texto: "SESMT regionalizado ou estadual constituído corretamente, quando aplicável" },
      { cod: "4.5.1", texto: "Dimensionamento do SESMT compatível com o nº de empregados e o grau de risco (Anexos I e II)" },
      { cod: "4.5.3", texto: "SESMT comum organizado corretamente quando há empresas contratadas no estabelecimento" },
      { cod: "4.6.1", texto: "SESMT registrado e com dados atualizados no sistema eletrônico do gov.br" },
      { cod: "4.7", texto: "SESMT participa da elaboração do inventário de riscos do PGR" },
      { cod: "4.7.3", texto: "Médico do trabalho formalmente nomeado coordenador do PCMSO" },
    ],
  },
  {
    id: "nr5",
    numero: "NR-5",
    titulo: "CIPA — Comissão Interna de Prevenção de Acidentes e Assédio",
    itens: [
      { cod: "5.3", texto: "CIPA constituída conforme dimensionamento exigido para a empresa" },
      { cod: "5.10", texto: "Atas de reuniões da CIPA arquivadas e atualizadas" },
      { cod: "5.7", texto: "Mapa de risco elaborado e afixado em local visível" },
      { cod: "5.4", texto: "Processo eleitoral documentado, quando aplicável" },
      { cod: "5.31", texto: "Membros da CIPA com treinamento realizado e certificado" },
      { cod: "5.11", texto: "Calendário anual de reuniões ordinárias cumprido" },
    ],
  },
  {
    id: "nr6",
    numero: "NR-6",
    titulo: "Equipamento de Proteção Individual (EPI)",
    itens: [
      { cod: "6.2", texto: "Certificado de Aprovação (CA) válido para os EPIs em uso" },
      { cod: "6.5, c", texto: "EPI fornecido gratuitamente, adequado ao risco, em perfeito estado de conservação" },
      { cod: "6.5.1, g", texto: "EPI substituído sempre que houver dano, extravio ou vencimento" },
      { cod: "6.5.1.1", texto: "Fornecimento de EPI registrado (ficha física ou sistema eletrônico/biométrico)" },
      { cod: "6.7.2", texto: "Trabalhador orientado sobre uso, higienização e substituição do EPI" },
      { cod: "6.7", texto: "Trabalhador responsável pela guarda, conservação e higienização do EPI, quando aplicável" },
    ],
  },
  {
    id: "nr7",
    numero: "NR-7",
    titulo: "Programa de Controle Médico de Saúde Ocupacional (PCMSO)",
    itens: [
      { cod: "7.4", texto: "PCMSO elaborado e coordenado por médico do trabalho" },
      { cod: "7.5", texto: "Exames admissionais, periódicos e demissionais em dia" },
      { cod: "7.5.5", texto: "Atestado de Saúde Ocupacional (ASO) arquivado para cada trabalhador" },
      { cod: "7.9", texto: "Relatório Analítico Anual do PCMSO disponível" },
      { cod: "7.5.2", texto: "Exames complementares compatíveis com os riscos ocupacionais realizados" },
    ],
  },
  {
    id: "nr8",
    numero: "NR-8",
    titulo: "Edificações",
    itens: [
      { cod: "8.1", texto: "Edificação atende requisitos de segurança estrutural, iluminação e conforto térmico" },
      { cod: "8.2", texto: "Pisos, corredores e passagens em boas condições, sem risco de escorregões e quedas" },
      { cod: "8.3", texto: "Instalações elétricas embutidas conforme normas técnicas" },
      { cod: "8.4", texto: "Áreas de circulação com dimensões adequadas ao fluxo de pessoas" },
    ],
  },
  {
    id: "nr9",
    numero: "NR-9",
    titulo: "Avaliação e Controle das Exposições a Agentes Físicos, Químicos e Biológicos",
    itens: [
      { cod: "9.1.5", texto: "Avaliações qualitativas/quantitativas de agentes nocivos realizadas" },
      { cod: "9.1.2", texto: "Medidas de controle coletivo priorizadas antes do uso de EPI" },
      { cod: "9.1.6", texto: "Monitoramento periódico das exposições ocupacionais" },
      { cod: "9.1.7", texto: "Resultados das avaliações comunicados aos trabalhadores expostos" },
      { cod: "9.2", texto: "LTCAT elaborado e atualizado, quando aplicável" },
    ],
  },
  {
    id: "nr10",
    numero: "NR-10",
    titulo: "Segurança em Instalações e Serviços em Eletricidade",
    itens: [
      { cod: "10.8", texto: "Trabalhadores capacitados conforme curso básico/complementar da NR-10" },
      { cod: "10.2.4", texto: "Prontuário de instalações elétricas atualizado" },
      { cod: "10.2.8", texto: "Sinalização de segurança em painéis, quadros e áreas energizadas" },
      { cod: "10.2.9", texto: "EPIs e ferramentas isolantes adequadas disponíveis" },
      { cod: "10.5", texto: "Procedimento de bloqueio e etiquetagem (LOTO) implementado" },
      { cod: "10.9", texto: "Certificação de trabalhadores em SEP, quando aplicável" },
    ],
  },
  {
    id: "nr11",
    numero: "NR-11",
    titulo: "Transporte, Movimentação, Armazenagem e Manuseio de Materiais",
    itens: [
      { cod: "11.1", texto: "Operadores de empilhadeiras e equipamentos de transporte capacitados" },
      { cod: "11.1.5", texto: "Empilhadeiras e guindastes com inspeção e manutenção em dia" },
      { cod: "11.2", texto: "Armazenagem de materiais estável, sem risco de queda ou desabamento" },
      { cod: "11.1.4", texto: "Sinalização de capacidade de carga em equipamentos e estruturas" },
      { cod: "11.3", texto: "Corredores de circulação de veículos e pedestres demarcados" },
    ],
  },
  {
    id: "nr12",
    numero: "NR-12",
    titulo: "Segurança no Trabalho em Máquinas e Equipamentos",
    itens: [
      { cod: "12.3", texto: "Máquinas possuem dispositivos de proteção e sistemas de segurança" },
      { cod: "12.10", texto: "Análise de risco das máquinas realizada e documentada" },
      { cod: "12.12", texto: "Manual de instruções das máquinas disponível aos operadores" },
      { cod: "12.13", texto: "Capacitação dos operadores registrada e atualizada" },
      { cod: "12.4", texto: "Dispositivos de parada de emergência testados e funcionando" },
      { cod: "12.11", texto: "Manutenção preventiva das máquinas em dia" },
    ],
  },
  {
    id: "nr13",
    numero: "NR-13",
    titulo: "Caldeiras, Vasos de Pressão, Tubulações e Tanques Metálicos de Armazenamento",
    itens: [
      { cod: "13.1.5", texto: "Caldeiras e vasos de pressão com Prontuário e registro de segurança" },
      { cod: "13.1.14", texto: "Inspeções de segurança periódicas (interna, externa, hidrostática) em dia" },
      { cod: "13.1.9", texto: "Operadores capacitados e com certificado válido" },
      { cod: "13.1.6", texto: "Dispositivos de segurança (válvulas, manômetros) calibrados e funcionais" },
      { cod: "13.4", texto: "Categoria de risco calculada e documentada conforme a norma" },
    ],
  },
  {
    id: "nr14",
    numero: "NR-14",
    titulo: "Fornos",
    itens: [
      { cod: "14.1", texto: "Fornos construídos com materiais resistentes e localização segura" },
      { cod: "14.2", texto: "Distância adequada entre fornos e materiais inflamáveis" },
      { cod: "14.3", texto: "Sinalização de segurança nas áreas de fornos" },
    ],
  },
  {
    id: "nr15",
    numero: "NR-15",
    titulo: "Atividades e Operações Insalubres",
    itens: [
      { cod: "15.1", texto: "Laudo Técnico das Condições Ambientais de Trabalho (LTCAT) atualizado" },
      { cod: "15.2", texto: "Medições de agentes insalubres dentro dos limites de tolerância ou com medidas de controle" },
      { cod: "15.4", texto: "Adicional de insalubridade pago corretamente, quando aplicável" },
      { cod: "15.5", texto: "EPIs eficazes para neutralização do agente insalubre fornecidos" },
    ],
  },
  {
    id: "nr16",
    numero: "NR-16",
    titulo: "Atividades e Operações Perigosas",
    itens: [
      { cod: "16.1", texto: "Laudo técnico de periculosidade elaborado, quando aplicável" },
      { cod: "16.2", texto: "Áreas de risco (inflamáveis, explosivos, eletricidade, radiação) identificadas e sinalizadas" },
      { cod: "16.3", texto: "Adicional de periculosidade pago corretamente aos trabalhadores expostos" },
      { cod: "16.4", texto: "Procedimentos específicos para atividades perigosas documentados" },
    ],
  },
  {
    id: "nr17",
    numero: "NR-17",
    titulo: "Ergonomia",
    itens: [
      { cod: "17.3", texto: "Análise Ergonômica do Trabalho (AET) elaborada, quando aplicável" },
      { cod: "17.4", texto: "Mobiliário e postos de trabalho adequados às características dos trabalhadores" },
      { cod: "17.6.4", texto: "Pausas para descanso previstas em atividades repetitivas" },
      { cod: "17.5", texto: "Levantamento e transporte manual de cargas dentro dos limites recomendados" },
      { cod: "17.5.2", texto: "Condições ambientais (iluminação, ruído, temperatura) compatíveis com a atividade" },
    ],
  },
  {
    id: "nr18",
    numero: "NR-18",
    titulo: "Segurança e Saúde no Trabalho na Indústria da Construção",
    itens: [
      { cod: "18.3", texto: "PGR específico da obra elaborado" },
      { cod: "18.4", texto: "Áreas de vivência (banheiro, refeitório, alojamento) adequadas" },
      { cod: "18.7", texto: "Proteções coletivas contra quedas de altura instaladas" },
      { cod: "18.5", texto: "Sinalização de segurança nos canteiros de obra" },
      { cod: "18.15", texto: "Andaimes e plataformas de trabalho inspecionados e liberados" },
    ],
  },
  {
    id: "nr19",
    numero: "NR-19",
    titulo: "Explosivos",
    itens: [
      { cod: "19.2", texto: "Depósitos de explosivos licenciados e distantes de áreas habitadas" },
      { cod: "19.3", texto: "Transporte de explosivos conforme normas de segurança" },
      { cod: "19.4", texto: "Trabalhadores capacitados para manuseio de explosivos" },
      { cod: "19.5", texto: "Sinalização de área de risco de explosão" },
    ],
  },
  {
    id: "nr20",
    numero: "NR-20",
    titulo: "Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis",
    itens: [
      { cod: "20.2", texto: "Classificação das áreas de risco (inflamáveis/combustíveis) realizada" },
      { cod: "20.3", texto: "Sistema de gestão de segurança de processo implementado, quando aplicável" },
      { cod: "20.10", texto: "Permissão de trabalho para atividades com fontes de ignição" },
      { cod: "20.5", texto: "Prova de estanqueidade e integridade de tanques e tubulações" },
    ],
  },
  {
    id: "nr21",
    numero: "NR-21",
    titulo: "Trabalho a Céu Aberto",
    itens: [
      { cod: "21.1", texto: "Proteção contra exposição solar e intempéries fornecida (abrigo, protetor solar)" },
      { cod: "21.2", texto: "Fornecimento de água potável em locais de trabalho a céu aberto" },
      { cod: "21.3", texto: "Pausas para descanso em atividades expostas a condições climáticas adversas" },
    ],
  },
  {
    id: "nr22",
    numero: "NR-22",
    titulo: "Segurança e Saúde Ocupacional na Mineração",
    itens: [
      { cod: "22.3", texto: "Plano de Gerenciamento de Riscos específico da mineração elaborado" },
      { cod: "22.10", texto: "Sistema de ventilação e controle de poeira em subsolo adequado" },
      { cod: "22.6", texto: "Trabalhadores capacitados conforme as atividades de mineração" },
      { cod: "22.21", texto: "Equipamentos de resgate e emergência disponíveis" },
    ],
  },
  {
    id: "nr23",
    numero: "NR-23",
    titulo: "Proteção Contra Incêndios",
    itens: [
      { cod: "23.3", texto: "Saídas de emergência sinalizadas e desobstruídas" },
      { cod: "23.17", texto: "Extintores adequados, dentro da validade e sinalizados" },
      { cod: "23.4", texto: "Brigada de incêndio treinada, quando exigido" },
      { cod: "23.3.1", texto: "Rotas de fuga identificadas e conhecidas pelos trabalhadores" },
      { cod: "23.19", texto: "Sistema de alarme e combate a incêndio testado periodicamente" },
    ],
  },
  {
    id: "nr24",
    numero: "NR-24",
    titulo: "Condições Sanitárias e de Conforto nos Locais de Trabalho",
    itens: [
      { cod: "24.1.1", texto: "Dimensionamento das instalações baseado no turno com maior contingente de trabalhadores" },
      { cod: "24.2.10", texto: "Vestiários com armários individuais em condições adequadas" },
      { cod: "24.2.16", texto: "Vestiário utilizado exclusivamente para sua finalidade, sem uso indevido" },
      { cod: "24.3.1", texto: "Refeitório disponível quando o estabelecimento tiver mais de 300 trabalhadores" },
      { cod: "24.5.3", texto: "Alojamentos, quando existentes, atendem aos requisitos de localização e dimensionamento" },
      { cod: "24.1", texto: "Fornecimento de água potável em quantidade suficiente" },
    ],
  },
  {
    id: "nr25",
    numero: "NR-25",
    titulo: "Resíduos Industriais",
    itens: [
      { cod: "25.1", texto: "Resíduos industriais identificados, segregados e armazenados corretamente" },
      { cod: "25.2", texto: "Destinação final de resíduos conforme legislação ambiental" },
      { cod: "25.3", texto: "Áreas de armazenamento temporário de resíduos sinalizadas" },
    ],
  },
  {
    id: "nr26",
    numero: "NR-26",
    titulo: "Sinalização de Segurança",
    itens: [
      { cod: "26.1", texto: "Sinalização de segurança (cores, símbolos) conforme padrões estabelecidos" },
      { cod: "26.2", texto: "Rotulagem de produtos químicos e FISPQ disponível" },
      { cod: "26.3", texto: "Sinalização de áreas de risco, EPIs obrigatórios e rotas de fuga visível" },
    ],
  },
  {
    id: "nr28",
    numero: "NR-28",
    titulo: "Fiscalização e Penalidades",
    itens: [
      { cod: "28.1", texto: "Empresa ciente dos procedimentos de fiscalização do Ministério do Trabalho" },
      { cod: "28.2", texto: "Registro de autos de infração anteriores e ações corretivas tomadas" },
      { cod: "28.3", texto: "Documentação disponível para apresentação em fiscalização" },
    ],
  },
  {
    id: "nr29",
    numero: "NR-29",
    titulo: "Segurança e Saúde no Trabalho Portuário",
    itens: [
      { cod: "29.3", texto: "Trabalhadores portuários capacitados conforme atividades de movimentação de carga" },
      { cod: "29.4", texto: "Equipamentos portuários com inspeção e manutenção em dia" },
      { cod: "29.5", texto: "Sinalização de áreas de operação portuária" },
    ],
  },
  {
    id: "nr30",
    numero: "NR-30",
    titulo: "Segurança e Saúde no Trabalho Aquaviário",
    itens: [
      { cod: "30.2", texto: "Embarcações com certificados de segurança válidos" },
      { cod: "30.3", texto: "Tripulação capacitada em segurança do trabalho aquaviário" },
      { cod: "30.4", texto: "Equipamentos de salvatagem e combate a incêndio a bordo verificados" },
    ],
  },
  {
    id: "nr31",
    numero: "NR-31",
    titulo: "Agricultura, Pecuária, Silvicultura, Exploração Florestal e Aquicultura",
    itens: [
      { cod: "31.3", texto: "PGR Rural elaborado considerando riscos específicos da atividade rural" },
      { cod: "31.8", texto: "Armazenamento e aplicação de agrotóxicos conforme normas de segurança" },
      { cod: "31.5", texto: "Capacitação dos trabalhadores rurais para máquinas e produtos químicos" },
      { cod: "31.23", texto: "Condições de moradia e transporte rural adequadas, quando fornecidas" },
    ],
  },
  {
    id: "nr32",
    numero: "NR-32",
    titulo: "Segurança e Saúde no Trabalho em Serviços de Saúde",
    itens: [
      { cod: "32.2", texto: "Programa de controle de riscos biológicos implementado" },
      { cod: "32.8", texto: "Gerenciamento de resíduos de serviços de saúde (RSS) conforme normas" },
      { cod: "32.2.4", texto: "Vacinação dos trabalhadores contra riscos biológicos ocupacionais" },
      { cod: "32.2.20", texto: "Procedimentos para acidentes com material perfurocortante" },
    ],
  },
  {
    id: "nr33",
    numero: "NR-33",
    titulo: "Segurança e Saúde no Trabalho em Espaços Confinados",
    itens: [
      { cod: "33.1.2", texto: "Espaços confinados identificados e sinalizados" },
      { cod: "33.3.6", texto: "Permissão de Entrada e Trabalho (PET) emitida antes de cada entrada" },
      { cod: "33.3.5", texto: "Monitoramento da atmosfera do espaço confinado realizado" },
      { cod: "33.3.9", texto: "Trabalhadores capacitados como vigia, supervisor de entrada e autorizado" },
    ],
  },
  {
    id: "nr34",
    numero: "NR-34",
    titulo: "Indústria da Construção, Reparação e Desmonte Naval",
    itens: [
      { cod: "34.3", texto: "Procedimentos de segurança para trabalho a bordo de embarcações em construção/reparo" },
      { cod: "34.4", texto: "Espaços confinados em embarcações identificados e controlados" },
      { cod: "34.5", texto: "Trabalho a quente (solda, corte) com permissão específica" },
    ],
  },
  {
    id: "nr35",
    numero: "NR-35",
    titulo: "Trabalho em Altura",
    itens: [
      { cod: "35.4", texto: "Trabalhadores capacitados com certificado válido para trabalho em altura" },
      { cod: "35.5", texto: "Análise de Risco (AR) e Permissão de Trabalho (PT) emitidas quando exigido" },
      { cod: "35.5.5", texto: "Sistemas de ancoragem e proteção contra quedas adequados" },
      { cod: "35.4.3", texto: "Exame médico específico (aptidão para trabalho em altura) em dia" },
      { cod: "35.6", texto: "Procedimento de resgate e primeiros socorros definido" },
      { cod: "35.5.4", texto: "EPIs para trabalho em altura inspecionados periodicamente" },
    ],
  },
  {
    id: "nr36",
    numero: "NR-36",
    titulo: "Abate e Processamento de Carnes e Derivados",
    itens: [
      { cod: "36.7", texto: "Ritmo de trabalho e pausas compatíveis com prevenção de LER/DORT" },
      { cod: "36.6", texto: "Ambiente com controle de temperatura adequado às atividades" },
      { cod: "36.10", texto: "EPIs específicos para atividades de corte e abate fornecidos" },
    ],
  },
  {
    id: "nr37",
    numero: "NR-37",
    titulo: "Segurança e Saúde em Plataformas de Petróleo",
    itens: [
      { cod: "37.22", texto: "Análise de riscos da plataforma revisada ou revalidada a cada 5 anos" },
      { cod: "37.30", texto: "Plano de Resposta a Emergências (PRE) elaborado conforme os cenários de risco identificados" },
      { cod: "37.8.10.6", texto: "Treinamento avançado (mín. 8h) realizado para trabalhadores em contato direto com o processo" },
      { cod: "37.8.10.6.1", texto: "Reciclagem do treinamento avançado realizada a cada 5 anos ou após alteração de risco" },
      { cod: "37.14.1", texto: "Áreas de vivência (alojamento) atendem aos requisitos da norma" },
      { cod: "37.32.1.1", texto: "Comunicação de incidentes/sinistros feita à SRTb dentro do prazo estabelecido" },
    ],
  },
  {
    id: "nr38",
    numero: "NR-38",
    titulo: "Limpeza Urbana e Manejo de Resíduos Sólidos",
    itens: [
      { cod: "38.5", texto: "Trabalhadores com EPIs adequados (colete refletivo, luvas, botas)" },
      { cod: "38.6", texto: "Veículos de coleta com dispositivos de segurança (câmeras, sinalização sonora)" },
      { cod: "38.4", texto: "Capacitação sobre riscos biológicos e perfurocortantes em resíduos" },
    ],
  },
];

const STORAGE_KEY = "inspecao-mjc-v1";
const QUEUE_KEY = "inspecao-mjc-fila-envio";

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("Falha ao salvar localmente:", e);
    return false;
  }
}

export default function PrevencaoMJC() {
  const initial = loadLocal(STORAGE_KEY, {});
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState(initial.info || { empresa: "", unidade: "", responsavel: "", data: "" });
  const [respostas, setRespostas] = useState(initial.respostas || {}); // { "nr1:1.1:0": { status, obs } }
  const [notasGerais, setNotasGerais] = useState(initial.notasGerais || {}); // { nr1: "apontamentos..." }
  const [selectedNR, setSelectedNR] = useState(NRS[0].id);
  const [view, setView] = useState("inspecao"); // inspecao | dashboard
  const [envioStatus, setEnvioStatus] = useState("idle"); // idle | enviando | sucesso | erro
  const [filaPendente, setFilaPendente] = useState(() => loadLocal(QUEUE_KEY, []));
  const saveTimer = useRef(null);

  // Salva localmente (neste aparelho) com debounce
  useEffect(() => {
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveLocal(STORAGE_KEY, { info, respostas, notasGerais });
      setSaving(false);
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [info, respostas, notasGerais]);

  function setNotaGeral(nrId, texto) {
    setNotasGerais((prev) => ({ ...prev, [nrId]: texto }));
  }

  function setStatus(key, status) {
    setRespostas((prev) => {
      const current = prev[key] || { status: null, obs: "" };
      const nextStatus = current.status === status ? null : status; // clique de novo desmarca
      return { ...prev, [key]: { ...current, status: nextStatus } };
    });
  }

  function setObs(key, obs) {
    setRespostas((prev) => {
      const current = prev[key] || { status: null, obs: "" };
      return { ...prev, [key]: { ...current, obs } };
    });
  }

  function resetTudo() {
    if (window.confirm("Limpar todas as respostas e observações desta inspeção?")) {
      setRespostas({});
      setNotasGerais({});
    }
  }

  // Monta o pacote de dados desta inspeção no formato que o Apps Script espera
  function montarPayload() {
    const rows = [];
    NRS.forEach((nr) => {
      nr.itens.forEach((item, idx) => {
        const key = `${nr.id}:${item.cod}:${idx}`;
        const r = respostas[key];
        if (r && (r.status || (r.obs && r.obs.trim()))) {
          rows.push({
            nrNumero: nr.numero,
            nrTitulo: nr.titulo,
            tipo: "item",
            itemCod: item.cod,
            itemTexto: item.texto,
            status: r.status || "",
            observacao: r.obs || "",
          });
        }
      });
      const notaGeral = notasGerais[nr.id];
      if (notaGeral && notaGeral.trim()) {
        rows.push({
          nrNumero: nr.numero,
          nrTitulo: nr.titulo,
          tipo: "geral",
          itemCod: "",
          itemTexto: "",
          status: "",
          observacao: notaGeral,
        });
      }
    });
    return {
      inspetor: info.responsavel || "",
      empresa: info.empresa || "",
      unidade: info.unidade || "",
      dataInspecao: info.data || "",
      enviadoEm: new Date().toISOString(),
      rows,
    };
  }

  async function enviarPayload(payload) {
    // mode: "no-cors" é necessário porque o Apps Script não retorna cabeçalhos
    // CORS: com o modo padrão ("cors"), o navegador bloqueia a leitura da
    // resposta e o fetch rejeita com "Failed to fetch" mesmo quando a
    // requisição chega e é processada normalmente no servidor. Em "no-cors"
    // a resposta fica opaca (não dá pra checar resp.ok), então sucesso aqui
    // significa apenas que a requisição foi enviada sem erro de rede.
    await fetch(SHEETS_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
  }

  async function enviarInspecao() {
    if (!SHEETS_ENDPOINT || SHEETS_ENDPOINT.includes("COLE_AQUI")) {
      alert("O endereço de envio ainda não foi configurado em src/config.js (veja o README).");
      return;
    }
    const payload = montarPayload();
    if (payload.rows.length === 0) {
      alert("Preencha ao menos um item antes de enviar.");
      return;
    }
    setEnvioStatus("enviando");
    try {
      await enviarPayload(payload);
      setEnvioStatus("sucesso");
      setTimeout(() => setEnvioStatus("idle"), 4000);
    } catch (e) {
      const novaFila = [...filaPendente, payload];
      setFilaPendente(novaFila);
      saveLocal(QUEUE_KEY, novaFila);
      setEnvioStatus("erro");
    }
  }

  async function tentarReenviarFila() {
    const filaAtual = loadLocal(QUEUE_KEY, []);
    if (filaAtual.length === 0 || !SHEETS_ENDPOINT || SHEETS_ENDPOINT.includes("COLE_AQUI")) return;
    const restante = [];
    for (const payload of filaAtual) {
      try {
        await enviarPayload(payload);
      } catch (e) {
        restante.push(payload);
      }
    }
    setFilaPendente(restante);
    saveLocal(QUEUE_KEY, restante);
  }

  // Tenta reenviar pendências ao abrir o app e sempre que a conexão voltar
  useEffect(() => {
    tentarReenviarFila();
    window.addEventListener("online", tentarReenviarFila);
    return () => window.removeEventListener("online", tentarReenviarFila);
  }, []);

  // Estatísticas por NR
  const nrStats = useMemo(() => {
    const map = {};
    for (const nr of NRS) {
      let atende = 0,
        parcial = 0,
        naoAtende = 0;
      nr.itens.forEach((item, idx) => {
        const key = `${nr.id}:${item.cod}:${idx}`;
        const st = respostas[key]?.status;
        if (st === STATUS.ATENDE) atende++;
        else if (st === STATUS.PARCIAL) parcial++;
        else if (st === STATUS.NAO_ATENDE) naoAtende++;
      });
      const total = nr.itens.length;
      const respondidos = atende + parcial + naoAtende;
      map[nr.id] = {
        total,
        respondidos,
        atende,
        parcial,
        naoAtende,
        pctRespondido: total ? Math.round((respondidos / total) * 100) : 0,
        pctAtende: total ? Math.round((atende / total) * 100) : 0,
      };
    }
    return map;
  }, [respostas]);

  const overall = useMemo(() => {
    let total = 0,
      respondidos = 0,
      atende = 0,
      parcial = 0,
      naoAtende = 0;
    for (const nr of NRS) {
      const s = nrStats[nr.id];
      total += s.total;
      respondidos += s.respondidos;
      atende += s.atende;
      parcial += s.parcial;
      naoAtende += s.naoAtende;
    }
    return { total, respondidos, atende, parcial, naoAtende };
  }, [nrStats]);

  const currentNR = NRS.find((n) => n.id === selectedNR);

  return (
    <div
      style={{ background: C.page, fontFamily: "'IBM Plex Sans', sans-serif", color: C.ink }}
      className="w-full min-h-screen"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .mjc-display { font-family: 'Oswald', sans-serif; letter-spacing: 0.01em; }
        .mjc-mono { font-family: 'IBM Plex Mono', monospace; }
        .mjc-scroll::-webkit-scrollbar { width: 8px; }
        .mjc-scroll::-webkit-scrollbar-thumb { background: ${C.lineStrong}; border-radius: 4px; }
        .mjc-input { outline: none; }
        .mjc-input:focus { box-shadow: 0 0 0 2px ${C.orange}55; border-color: ${C.orange} !important; }
        .mjc-switch-btn:focus-visible { outline: 2px solid ${C.navy}; outline-offset: 2px; }
        .mjc-nrbtn:focus-visible { outline: 2px solid ${C.orange}; outline-offset: -2px; }
        textarea.mjc-input:focus { box-shadow: 0 0 0 2px ${C.orange}55; }
      `}</style>

      {/* Cabeçalho */}
      <header style={{ background: C.navyDeep, borderBottom: `4px solid ${C.orange}` }}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              style={{ background: C.orange, borderRadius: 6 }}
              className="w-10 h-10 flex items-center justify-center shrink-0"
            >
              <ShieldCheck size={22} color="#fff" strokeWidth={2.4} />
            </div>
            <div>
              <div className="mjc-display text-white text-xl leading-none" style={{ fontWeight: 700 }}>
                PREVENÇÃO MJC
              </div>
              <div
                className="mjc-mono text-[11px] mt-1 uppercase tracking-wider"
                style={{ color: "#9FB4C4" }}
              >
                Módulo de Inspeção · Segurança e Medicina do Trabalho
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] mjc-mono" style={{ color: "#9FB4C4" }}>
            {saving ? (
              <>
                <Loader2 size={12} className="animate-spin" /> salvando neste aparelho…
              </>
            ) : (
              <>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: C.green, display: "inline-block" }} />
                salvo neste aparelho
              </>
            )}
          </div>
        </div>
      </header>

      <nav style={{ background: C.paper, borderBottom: `1px solid ${C.line}` }}>
        <div className="max-w-6xl mx-auto px-5 flex gap-1">
          {[
            { id: "inspecao", label: "Inspeção", Icon: ClipboardList },
            { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className="mjc-switch-btn flex items-center gap-1.5 px-3.5 py-2.5 text-[13px]"
              style={{
                fontWeight: 600,
                color: view === id ? C.navy : C.inkMuted,
                borderBottom: view === id ? `2px solid ${C.orange}` : "2px solid transparent",
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </nav>

      {view === "dashboard" ? (
        <Suspense
          fallback={
            <div className="max-w-6xl mx-auto px-5 py-10 text-center" style={{ color: C.inkMuted }}>
              <Loader2 size={20} className="animate-spin inline-block mr-2" />
              Carregando dashboard…
            </div>
          }
        >
          <Dashboard />
        </Suspense>
      ) : (
      <div className="max-w-6xl mx-auto px-5 py-6">
        {/* Ficha da inspeção */}
        <section
          style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8 }}
          className="p-4 md:p-5 mb-5 relative"
        >
          {/* marcas de canto — referência a prancha técnica */}
          <CornerMarks />
          <div className="mjc-display text-[13px] uppercase tracking-wider mb-3" style={{ color: C.navy, fontWeight: 600 }}>
            Identificação da inspeção
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field icon={Building2} label="Empresa" value={info.empresa} onChange={(v) => setInfo({ ...info, empresa: v })} placeholder="Razão social" />
            <Field icon={MapPin} label="Unidade / Setor" value={info.unidade} onChange={(v) => setInfo({ ...info, unidade: v })} placeholder="Ex.: Planta 2 — Almoxarifado" />
            <Field icon={User} label="Responsável técnico" value={info.responsavel} onChange={(v) => setInfo({ ...info, responsavel: v })} placeholder="Nome do inspetor" />
            <Field icon={Calendar} label="Data" value={info.data} onChange={(v) => setInfo({ ...info, data: v })} placeholder="dd/mm/aaaa" type="date" />
          </div>
        </section>

        {/* Resumo geral */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <SummaryCard label="Itens" value={overall.total} color={C.navy} />
          <SummaryCard label="Verificados" value={`${overall.respondidos}/${overall.total}`} color={C.ink} />
          <SummaryCard label="Atende" value={overall.atende} color={C.green} bg={C.greenBg} />
          <SummaryCard label="Parcial" value={overall.parcial} color={C.amber} bg={C.amberBg} />
          <SummaryCard label="Não atende" value={overall.naoAtende} color={C.red} bg={C.redBg} />
        </section>

        {/* Aviso sobre a numeração */}
        <section
          style={{ background: C.paperAlt, border: `1px solid ${C.line}`, borderRadius: 8 }}
          className="px-4 py-3 mb-5 flex items-start gap-2.5"
        >
          <Info size={15} color={C.orangeDeep} className="shrink-0 mt-0.5" />
          <p className="text-[12px] leading-snug" style={{ color: C.inkMuted }}>
            Os códigos ao lado de cada item indicam a seção da própria NR à qual o requisito se refere. A numeração
            das <strong style={{ color: C.ink }}>NR-1, NR-4, NR-6, NR-24 e NR-37</strong> foi conferida com mais rigor em fontes oficiais e
            especializadas atualizadas. As demais normas usam numeração de referência geral. Como as NRs são revisadas
            periodicamente (ex.: NR-1 e NR-10 tiveram mudanças recentes), confirme sempre a redação vigente em{" "}
            <span className="mjc-mono" style={{ color: C.navy, fontWeight: 600 }}>
              gov.br/trabalho-e-emprego
            </span>{" "}
            antes de formalizar um laudo ou auto de inspeção.
          </p>
        </section>

        {/* Seletor de NR */}
        <section
          style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8 }}
          className="p-4 md:p-5 mb-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={15} color={C.navy} />
            <span className="mjc-display text-[12px] uppercase tracking-wider" style={{ color: C.navy, fontWeight: 600 }}>
              Norma regulamentadora a inspecionar
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={selectedNR}
              onChange={(e) => setSelectedNR(e.target.value)}
              className="mjc-input flex-1 text-[14px] px-3 py-2.5 rounded"
              style={{ border: `1px solid ${C.lineStrong}`, background: "#fff", color: C.ink, fontWeight: 500 }}
            >
              {NRS.map((nr) => {
                const s = nrStats[nr.id];
                return (
                  <option key={nr.id} value={nr.id}>
                    {nr.numero} — {nr.titulo} ({s.respondidos}/{s.total})
                  </option>
                );
              })}
            </select>
            <button
              onClick={resetTudo}
              className="flex items-center justify-center gap-2 text-[12px] px-3 py-2.5 rounded shrink-0"
              style={{ color: C.red, border: `1px solid ${C.red}55`, background: C.redBg }}
            >
              <RotateCcw size={13} /> Limpar respostas
            </button>
          </div>
        </section>

        {/* Checklist da NR selecionada */}
        <main style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8 }} className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <div>
              <div className="mjc-mono text-[11px] uppercase tracking-wider" style={{ color: C.orangeDeep, fontWeight: 600 }}>
                {currentNR.numero}
              </div>
              <h2 className="mjc-display text-lg" style={{ fontWeight: 600, color: C.navy }}>
                {currentNR.titulo}
              </h2>
            </div>
            <div className="text-[12px] mjc-mono px-2.5 py-1 rounded" style={{ background: C.paperAlt, color: C.inkMuted }}>
              {nrStats[currentNR.id].respondidos}/{nrStats[currentNR.id].total} verificados
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {currentNR.itens.map((item, idx) => {
              const key = `${currentNR.id}:${item.cod}:${idx}`;
              const resp = respostas[key] || { status: null, obs: "" };
              return (
                <ChecklistItem
                  key={key}
                  cod={item.cod}
                  texto={item.texto}
                  status={resp.status}
                  obs={resp.obs}
                  onStatus={(st) => setStatus(key, st)}
                  onObs={(v) => setObs(key, v)}
                />
              );
            })}
          </div>

          {/* Apontamentos gerais da NR */}
          <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${C.line}` }}>
            <label className="flex flex-col gap-1.5">
              <span
                className="mjc-display text-[12px] uppercase tracking-wider"
                style={{ color: C.navy, fontWeight: 600 }}
              >
                Apontamentos gerais — {currentNR.numero}
              </span>
              <textarea
                value={notasGerais[currentNR.id] || ""}
                onChange={(e) => setNotaGeral(currentNR.id, e.target.value)}
                placeholder="Observações gerais sobre esta norma, não vinculadas a um item específico…"
                rows={5}
                className="mjc-input w-full text-[13px] px-3 py-2.5 rounded resize-y"
                style={{ border: `1px solid ${C.line}`, background: C.paperAlt, color: C.ink }}
              />
            </label>
          </div>
        </main>

        {/* Envio para o administrador */}
        <section
          style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8 }}
          className="p-4 md:p-5 mt-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            {envioStatus === "sucesso" ? (
              <CheckCircle2 size={18} color={C.green} className="shrink-0 mt-0.5" />
            ) : filaPendente.length > 0 ? (
              <CloudOff size={18} color={C.amber} className="shrink-0 mt-0.5" />
            ) : (
              <Send size={18} color={C.navy} className="shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-[13px]" style={{ color: C.ink, fontWeight: 600 }}>
                {envioStatus === "sucesso"
                  ? "Inspeção enviada ao administrador"
                  : envioStatus === "erro"
                  ? "Sem conexão — ficou salvo para reenvio automático"
                  : "Envie os resultados para o administrador"}
              </div>
              <div className="text-[11.5px]" style={{ color: C.inkMuted }}>
                {filaPendente.length > 0
                  ? `${filaPendente.length} envio(s) pendente(s) — serão reenviados automaticamente quando houver conexão.`
                  : "Os dados vão direto para a planilha do administrador, sem custo de nuvem."}
              </div>
            </div>
          </div>
          <button
            onClick={enviarInspecao}
            disabled={envioStatus === "enviando"}
            className="flex items-center justify-center gap-2 text-[13px] px-4 py-2.5 rounded shrink-0"
            style={{ background: C.orange, color: "#fff", fontWeight: 600, opacity: envioStatus === "enviando" ? 0.7 : 1 }}
          >
            {envioStatus === "enviando" ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Enviando…
              </>
            ) : (
              <>
                <Send size={14} /> Enviar inspeção
              </>
            )}
          </button>
        </section>

        <p className="text-[11px] mt-6 text-center" style={{ color: C.inkFaint }}>
          Modelo de referência geral — valide e adapte os itens de verificação conforme a atividade, o porte e os
          riscos específicos de cada empresa e a redação vigente de cada Norma Regulamentadora.
        </p>
      </div>
      )}
    </div>
  );
}

function CornerMarks() {
  const s = 14;
  const style = { position: "absolute", width: s, height: s, borderColor: C.line };
  return (
    <>
      <span style={{ ...style, top: -1, left: -1, borderTop: "2px solid", borderLeft: "2px solid" }} />
      <span style={{ ...style, top: -1, right: -1, borderTop: "2px solid", borderRight: "2px solid" }} />
      <span style={{ ...style, bottom: -1, left: -1, borderBottom: "2px solid", borderLeft: "2px solid" }} />
      <span style={{ ...style, bottom: -1, right: -1, borderBottom: "2px solid", borderRight: "2px solid" }} />
    </>
  );
}

function Field({ icon: Icon, label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider flex items-center gap-1" style={{ color: C.inkMuted, fontWeight: 600 }}>
        <Icon size={11} /> {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mjc-input text-[13px] px-2.5 py-2 rounded"
        style={{ border: `1px solid ${C.line}`, background: C.paperAlt, color: C.ink }}
      />
    </label>
  );
}

function SummaryCard({ label, value, color, bg }) {
  return (
    <div
      style={{ background: bg || C.paper, border: `1px solid ${C.line}`, borderRadius: 8 }}
      className="px-3 py-3 flex flex-col gap-1"
    >
      <span className="text-[10px] uppercase tracking-wider" style={{ color: C.inkMuted, fontWeight: 600 }}>
        {label}
      </span>
      <span className="mjc-display text-xl" style={{ color, fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}

function ChecklistItem({ cod, texto, status, obs, onStatus, onObs }) {
  const meta = status ? STATUS_META[status] : null;
  return (
    <div
      style={{
        border: `1px solid ${meta ? meta.color + "55" : C.line}`,
        background: meta ? meta.bg : C.paperAlt,
        borderRadius: 8,
      }}
      className="p-3 md:p-3.5 transition-colors"
    >
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <span
          className="mjc-mono text-[11px] px-2 py-0.5 rounded shrink-0"
          style={{ color: C.navy, fontWeight: 700, background: "#fff", border: `1px solid ${C.lineStrong}` }}
        >
          {cod}
        </span>

        {/* seletor de status — estilo botoeira industrial */}
        <div
          className="flex shrink-0 rounded overflow-hidden"
          style={{ border: `1px solid ${C.lineStrong}`, background: "#fff" }}
        >
          {Object.entries(STATUS_META).map(([key, m], idx) => {
            const active = status === key;
            return (
              <button
                key={key}
                onClick={() => onStatus(key)}
                title={m.label}
                className="mjc-switch-btn flex items-center gap-1 px-2.5 py-1.5 text-[12px]"
                style={{
                  background: active ? m.color : "transparent",
                  color: active ? "#fff" : C.inkMuted,
                  borderLeft: idx > 0 ? `1px solid ${C.line}` : "none",
                  fontWeight: active ? 600 : 500,
                  boxShadow: active ? "inset 0 1px 3px rgba(0,0,0,0.25)" : "none",
                }}
              >
                <m.Icon size={13} />
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[13.5px] leading-snug mb-2.5" style={{ color: C.ink }}>
        {texto}
      </p>

      <textarea
        value={obs}
        onChange={(e) => onObs(e.target.value)}
        placeholder="Observação"
        rows={obs ? 2 : 1}
        className="mjc-input w-full text-[12.5px] px-2.5 py-2 rounded resize-y"
        style={{ border: `1px solid ${C.line}`, background: "#fff", color: C.ink }}
      />
    </div>
  );
}
