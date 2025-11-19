export enum RiveErrorType {
  Unknown = 0,
  FileNotFound = 1,
  MalformedFile = 2,
  IncorrectArtboardName = 3,
  IncorrectStateMachineName = 4,
  ViewModelInstanceNotFound = 6,
  IncorrectStateMachineInputName = 8,
}

export interface RiveError {
  message: string;
  type: RiveErrorType;
}
