export enum RiveErrorType {
  Unknown = 0,
  FileNotFound = 1,
  MalformedFile = 2,
  IncorrectArtboardName = 3,
  IncorrectStateMachineName = 4,
  IncorrectAnimationName = 5,
  DataBindingError = 6,
  TextRunNotFoundError = 7,
  IncorrectStateMachineInputName = 8,
}

export interface RiveError {
  message: string;
  type: RiveErrorType;
}
