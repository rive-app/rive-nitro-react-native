export enum RiveErrorType {
  Unknown = 0,
  FileNotFound = 1,
  MalformedFile = 2,
  IncorrectArtboardName = 3,
  IncorrectStateMachineName = 4,
  DataBindingError = 6,
}

export interface RiveError {
  message: string;
  type: RiveErrorType;
}
