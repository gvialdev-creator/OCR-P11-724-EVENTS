import PropTypes from "prop-types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const DataContext = createContext({});

export const api = {
  loadData: async () => {
    const json = await fetch("/events.json");
    // Tester l'appel à fetch avec une mauvaise URL :
    // const json = await fetch("/wrong-url.json");
    
    return json.json();
    // Tester l'appel à response.json()
    // return json;
    // Tester la valeur retournée
    // return {};
  },
};

export const DataProvider = ({ children }) => {
  const [error, setError] = useState(null);
  // Vérigier l'état initial de l'erreur
  // const [error, setError] = useState("unexpected error");
  const [data, setData] = useState(null);
  // Vérigier l'état initial de la donnée
  // const [data, setData] = useState({ result: "unexpected data" });
  const getData = useCallback(async () => {
    try {
      setData(await api.loadData());
      // Tester le stockage des données incorrectes
      // setData({ result: "wrong data" });
    } catch (err) {
      setError(err);
      // Tester le stockage de l'erreur
      // setError("wrong error");
    }
  }, []);
  useEffect(() => {
    if (data) return;
    getData();
  });
  
  return (
    <DataContext.Provider
      // eslint-disable-next-line react/jsx-no-constructed-context-values
      value={{
        data,
        error,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

DataProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useData = () => useContext(DataContext);

export default DataContext;
