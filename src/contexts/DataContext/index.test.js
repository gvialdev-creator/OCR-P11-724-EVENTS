import { render, screen } from "@testing-library/react";
import { DataProvider, api, useData } from "./index";

// Composant minimal permettant d'observer les valeurs exposees par le contexte.
const DataConsumer = () => {
  const { data, error } = useData();

  return (
    <div>
      <span data-testid="data">{data?.result ?? "no data"}</span>
      <span data-testid="error">{error ?? "no error"}</span>
    </div>
  );
};

// Second consommateur utilise pour verifier que le contexte est partage.
const SecondDataConsumer = () => {
  const { data } = useData();

  return <span data-testid="second-data">{data?.result}</span>;
};

// Consommateur permettant de verifier le type de l'erreur recue.
const ErrorTypeConsumer = () => {
  const { error } = useData();

  return (
    <span data-testid="error-type">
      {error instanceof Error ? "error-instance" : "not-an-error"}
    </span>
  );
};

// Ces tests verifient directement le contrat de la fonction de chargement.
// Ils ne rendent pas de composant React : seul l'appel HTTP est concerne.
describe("api.loadData", () => {
  afterEach(() => {
    // Chaque test doit repartir avec des mocks propres.
    jest.restoreAllMocks();
  });

  it("fetches and returns the events data", async () => {
    // La reponse simulee reproduit l'objet retourne par fetch.
    const events = { result: "ok" };
    const response = { json: jest.fn().mockResolvedValue(events) };
    const fetch = jest.spyOn(global, "fetch").mockResolvedValue(response);

    // La fonction doit retourner les donnees produites par response.json().
    await expect(api.loadData()).resolves.toEqual(events);

    // On verifie l'URL de la requete et le parsing de la reponse.
    expect(fetch).toHaveBeenCalledWith("/events.json");
    expect(response.json).toHaveBeenCalledTimes(1);
  });

  it("propagates a fetch error", async () => {
    // Une erreur reseau doit etre transmise au code qui appelle loadData.
    const error = new Error("events request failed");
    jest.spyOn(global, "fetch").mockRejectedValue(error);

    await expect(api.loadData()).rejects.toBe(error);
  });

  it("propagates a response parsing error", async () => {
    // Le chargement peut reussir alors que la conversion en JSON echoue.
    const error = new Error("invalid JSON");
    const response = { json: jest.fn().mockRejectedValue(error) };
    jest.spyOn(global, "fetch").mockResolvedValue(response);

    await expect(api.loadData()).rejects.toBe(error);
    expect(response.json).toHaveBeenCalledTimes(1);
  });
});

// Ces tests verifient la transmission des donnees et des erreurs
// aux composants qui utilisent le hook useData().
describe("When a data context is created", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("starts with no data and no error", () => {
    // La promesse reste en attente afin d'observer l'etat initial du contexte.
    jest.spyOn(api, "loadData").mockReturnValue(new Promise(() => {}));

    render(
      <DataProvider>
        <DataConsumer />
      </DataProvider>
    );

    // Avant la reponse de l'API, les deux valeurs doivent rester nulles.
    expect(screen.getByTestId("data")).toHaveTextContent("no data");
    expect(screen.getByTestId("error")).toHaveTextContent("no error");
  });

  it("loads data when the provider is mounted", () => {
    // La promesse en attente evite une mise a jour pendant cette assertion.
    const loadData = jest
      .spyOn(api, "loadData")
      .mockReturnValue(new Promise(() => {}));

    render(
      <DataProvider>
        <DataConsumer />
      </DataProvider>
    );

    // Le chargement est declenche automatiquement par le montage du provider.
    expect(loadData).toHaveBeenCalledTimes(1);
  });

  it("exposes the loaded data and keeps the error empty", async () => {
    // La promesse resolue simule une reponse valide de l'API.
    const loadData = jest
      .spyOn(api, "loadData")
      .mockResolvedValue({ result: "ok" });

    render(
      <DataProvider>
        <DataConsumer />
      </DataProvider>
    );

    // findByText attend la mise a jour asynchrone du contexte.
    expect(await screen.findByText("ok")).toBeInTheDocument();
    // Un chargement reussi ne doit pas renseigner le champ error.
    expect(screen.getByTestId("error")).toHaveTextContent("no error");
    expect(loadData).toHaveBeenCalledTimes(1);
  });

  it("provides the same data to multiple consumers", async () => {
    // Les deux composants doivent lire la meme valeur depuis le provider.
    jest.spyOn(api, "loadData").mockResolvedValue({ result: "ok" });

    render(
      <DataProvider>
        <DataConsumer />
        <SecondDataConsumer />
      </DataProvider>
    );

    // La valeur apparait deux fois, une fois par consommateur.
    expect(await screen.findAllByText("ok")).toHaveLength(2);
  });

  it("exposes the error and keeps data empty when loading fails", async () => {
    // Le premier appel echoue afin de tester la mise a disposition de l'erreur.
    const loadData = jest
      .spyOn(api, "loadData")
      .mockRejectedValueOnce("error on calling events")
      // Le second appel eventuel du provider reste en attente.
      .mockReturnValue(new Promise(() => {}));

    render(
      <DataProvider>
        <DataConsumer />
      </DataProvider>
    );

    // L'erreur doit etre visible et aucune donnee ne doit etre disponible.
    expect(
      await screen.findByText("error on calling events")
    ).toBeInTheDocument();
    expect(screen.getByTestId("data")).toHaveTextContent("no data");
    expect(loadData).toHaveBeenCalled();
  });

  it("exposes an Error instance when loading fails", async () => {
    // On verifie ici le type de l'erreur, et pas uniquement son message.
    const error = new Error("events request failed");
    jest
      .spyOn(api, "loadData")
      .mockRejectedValueOnce(error)
      // On neutralise ici la nouvelle tentative eventuelle du provider.
      .mockReturnValue(new Promise(() => {}));

    render(
      <DataProvider>
        <ErrorTypeConsumer />
      </DataProvider>
    );

    // Le consommateur confirme que l'erreur conserve son type Error.
    expect(await screen.findByText("error-instance")).toBeInTheDocument();
  });
});
