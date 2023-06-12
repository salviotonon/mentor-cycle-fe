import { OperationVariables, QueryHookOptions, useQuery } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import {
  ExtractDataType,
  FetchConfig,
  HookResponse,
  IErrorTypedFetch,
  TError,
} from "types/useTypedQuery.types";
import { SafeParseError, z } from "zod";

export function useTypedQuery<
  TDataSchema extends z.ZodType<any>,
  TVariablesSchema extends z.ZodType<any> | null | undefined
>(
  queryProperties: FetchConfig<TDataSchema, TVariablesSchema>,
  options?: QueryHookOptions<
    ExtractDataType<TDataSchema>,
    ExtractDataType<TVariablesSchema & {}> & OperationVariables
  >
): HookResponse<
  ExtractDataType<TDataSchema>,
  ExtractDataType<TVariablesSchema & {}>
> {
  type TData = ExtractDataType<TDataSchema>;
  type TVariables = ExtractDataType<TVariablesSchema & {}>;

  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<IErrorTypedFetch<TError<TData>> | null>(
    null
  );
  const { query, schema, variables: variablesSchema } = queryProperties;

  const parsedVariables = useMemo(() => {
    if (variablesSchema) {
      return variablesSchema.safeParse(options?.variables ?? {});
    } else if (options?.variables) {
      return { data: options?.variables, success: true };
    } else {
      return { data: {}, success: true };
    }
  }, [variablesSchema, options?.variables]);

  const variables = parsedVariables.success ? parsedVariables.data : undefined;

  const {
    data: queryData,
    error: queryError,
    loading: queryLoading,
    ...rest
  } = useQuery(query, {
    ...options,
    skip: !parsedVariables.success || options?.skip,
    variables,
    onError: (error) => {
      setError({
        error,
        type: "FETCHING_API_RESPONSE_DATA",
      });
      setLoading(false);
    },
    onCompleted: (unparsedData) => {
      schema
        .parseAsync(unparsedData)
        .then(setData)
        .catch((error) =>
          setError({
            error,
            type: "PARSING_API_RESPONSE_DATA",
          })
        )
        .finally(() => setLoading(false));
    },
  });

  useEffect(() => {
    if (!parsedVariables.success) {
      setError({
        error: (parsedVariables as SafeParseError<TVariables>).error,
        type: "PARSING_VARIABLES",
      });
    }
  }, [parsedVariables]);

  return { data, error, loading, ...rest };
}
