export type Rol = "ADMIN" | "LABORATORIO" | "IHQ" | "CADETE";

export type Usuario = {
  id: number;
  username: string;
  nombre: string;
  rol: Rol;
};

export type Sanatorio = {
  id: number;
  nombre: string;
  direccion: string | null;
  zona: string | null;
  tipoVisita: "RUTINA" | "A_DEMANDA";
  infoAdicional: string | null;
  activo: boolean;
};

export type TipoUrgencia = {
  id: number;
  nombre: string;
};

export type MuestraUrgente = {
  idTipo: number;
  nombre: string;
  cantidad: number | null;
};

export type EstadoParada = "PENDIENTE" | "REALIZADA" | "NO_REALIZADA";

export type MotivoNoRealizada =
  | "TRAFICO"
  | "CERRADO"
  | "SIN_TIEMPO"
  | "CENTRO_AVISO_NO_PASAR"
  | "OTRO";

export type Parada = {
  id: number;
  idCadete: number | null;
  cadeteNombre: string | null;
  fecha: string;
  sanatorio: Pick<Sanatorio, "id" | "nombre" | "direccion" | "zona" | "tipoVisita" | "infoAdicional">;
  estado: EstadoParada;
  confirmadaAt: string | null;
  horaLlegada: string | null;
  cantidadPaps: number;
  cantidadBiopsias: number;
  motivoNoRealizada: MotivoNoRealizada | null;
  reprogramadaDeId: number | null;
  notas: string | null;
  updatedAt: string;
  muestrasUrgentes: MuestraUrgente[];
};
